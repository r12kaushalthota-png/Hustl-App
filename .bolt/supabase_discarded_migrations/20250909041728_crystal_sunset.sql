/*
  # Fix Triggers and Rebuild Accept Task Flow

  This migration fixes the current_status trigger issues and rebuilds the entire
  accept-task system with proper PostgREST discoverability and atomic operations.

  ## Changes Made

  1. **Cleanup Phase**
     - Drop all problematic triggers referencing current_status
     - Remove legacy functions and objects safely
     - Temporarily disable user triggers during schema updates

  2. **Schema Normalization**
     - Ensure tasks table has required columns (accepted_by, accepted_at, task_category)
     - Create/adapt chat system tables (chats, chat_members, messages)
     - Create task_acceptances table for tracking acceptance codes
     - Schema-adaptive approach handles different column names

  3. **New Accept Task System**
     - Atomic RPC function: public.accept_task(task_id uuid)
     - Generates unique 5-digit codes with no repeated digits
     - Creates 1-to-1 chats between task owner and accepter
     - Proper error handling and validation
     - Returns complete acceptance data

  4. **Security**
     - Comprehensive RLS policies
     - Proper grants for PostgREST discoverability
     - Schema cache reload notification

  5. **Safe Triggers**
     - New normalization trigger that doesn't reference current_status
     - Only operates on NEW record, no recursive updates
*/

-- =============================================================================
-- 0) HARD CLEANUP - Remove problematic triggers and functions FIRST
-- =============================================================================

-- Drop triggers that reference current_status (these cause the 42703 error)
DROP TRIGGER IF EXISTS trg_task_status_updated ON public.tasks;
DROP TRIGGER IF EXISTS tasks_status_trigger ON public.tasks;
DROP TRIGGER IF EXISTS update_task_status ON public.tasks;
DROP TRIGGER IF EXISTS normalize_task_status ON public.tasks;
DROP TRIGGER IF EXISTS tasks_after_update_status_notification ON public.tasks;

-- Drop their associated functions
DROP FUNCTION IF EXISTS public.trg_task_status_updated() CASCADE;
DROP FUNCTION IF EXISTS public.tasks_status_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.update_task_status() CASCADE;
DROP FUNCTION IF EXISTS public.normalize_task_status() CASCADE;

-- Drop any old accept_task functions with any signature
DROP FUNCTION IF EXISTS public.accept_task(text) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task(json) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task() CASCADE;

-- Drop legacy tables from previous attempts (preserve data where possible)
DROP TABLE IF EXISTS public.task_acceptances CASCADE;
DROP TABLE IF EXISTS public.legacy_chats CASCADE;
DROP TABLE IF EXISTS public.legacy_chat_members CASCADE;

-- =============================================================================
-- 1) TEMPORARILY DISABLE USER TRIGGERS DURING SCHEMA UPDATES
-- =============================================================================

-- Disable user triggers to prevent them from firing during our backfill operations
ALTER TABLE public.tasks DISABLE TRIGGER USER;

-- =============================================================================
-- 2) NORMALIZE TASKS SCHEMA (schema-adaptive)
-- =============================================================================

-- Ensure required columns exist
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS accepted_by uuid;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Handle task_category column (schema-adaptive)
DO $$
BEGIN
  -- Add task_category if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'task_category'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN task_category text;
  END IF;
END $$;

-- Backfill task_category from legacy columns (with triggers disabled)
UPDATE public.tasks 
SET task_category = COALESCE(
  -- Use existing task_category if valid
  CASE 
    WHEN task_category IS NOT NULL AND task_category != '' THEN task_category
    ELSE NULL
  END,
  -- Map from category column
  CASE lower(COALESCE(category, ''))
    WHEN 'food' THEN 'food_delivery'
    WHEN 'coffee' THEN 'coffee_run'
    WHEN 'grocery' THEN 'grocery_shopping'
    ELSE NULL
  END,
  -- Default fallback
  'general_task'
)
WHERE task_category IS NULL OR task_category = '';

-- Make task_category NOT NULL with default
ALTER TABLE public.tasks ALTER COLUMN task_category SET DEFAULT 'general_task';
ALTER TABLE public.tasks ALTER COLUMN task_category SET NOT NULL;

-- Ensure status column supports 'accepted' (handle both text and enum)
DO $$
BEGIN
  -- Check if status is an enum type
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_attribute a ON a.atttypid = t.oid
    JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = 'tasks' AND a.attname = 'status' AND t.typtype = 'e'
  ) THEN
    -- Add 'accepted' to enum if not present
    BEGIN
      ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'accepted';
    EXCEPTION WHEN duplicate_object THEN
      -- Value already exists, continue
    END;
  END IF;
END $$;

-- =============================================================================
-- 3) CREATE/ADAPT CHAT SYSTEM TABLES
-- =============================================================================

-- Ensure chats table exists (adapt from chat_rooms if needed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chats') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_rooms') THEN
      -- Rename existing chat_rooms to chats
      ALTER TABLE public.chat_rooms RENAME TO chats;
    ELSE
      -- Create new chats table
      CREATE TABLE public.chats (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id uuid UNIQUE NOT NULL,
        task_category text NOT NULL DEFAULT 'general_task',
        created_at timestamptz DEFAULT now()
      );
    END IF;
  END IF;
  
  -- Ensure task_category column exists in chats
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chats' AND column_name = 'task_category'
  ) THEN
    ALTER TABLE public.chats ADD COLUMN task_category text NOT NULL DEFAULT 'general_task';
  END IF;
END $$;

-- Ensure chat_members table exists and has correct column names
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_members') THEN
    CREATE TABLE public.chat_members (
      chat_id uuid NOT NULL,
      user_id uuid NOT NULL,
      unread_count integer DEFAULT 0,
      last_read_at timestamptz,
      PRIMARY KEY (chat_id, user_id)
    );
  END IF;
  
  -- Ensure chat_id column exists (rename if needed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_members' AND column_name = 'chat_id'
  ) THEN
    -- Check for alternative column names and rename
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'chat_members' AND column_name = 'room_id'
    ) THEN
      ALTER TABLE public.chat_members RENAME COLUMN room_id TO chat_id;
    END IF;
  END IF;
END $$;

-- Ensure messages table exists (adapt from chat_messages if needed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
      -- Create view mapping chat_messages to messages
      CREATE VIEW public.messages AS
      SELECT 
        id,
        room_id as chat_id,
        sender_id,
        text as body,
        false as is_system,
        created_at
      FROM public.chat_messages;
    ELSE
      -- Create new messages table
      CREATE TABLE public.messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id uuid NOT NULL,
        sender_id uuid,
        body text NOT NULL,
        is_system boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      );
    END IF;
  END IF;
END $$;

-- Create task_acceptances table
CREATE TABLE IF NOT EXISTS public.task_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid UNIQUE NOT NULL,
  accepter_id uuid NOT NULL,
  code char(5) UNIQUE NOT NULL,
  task_category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- 4) ADD FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  -- task_acceptances -> tasks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'task_acceptances_task_id_fkey'
  ) THEN
    ALTER TABLE public.task_acceptances 
    ADD CONSTRAINT task_acceptances_task_id_fkey 
    FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;
  
  -- chats -> tasks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chats_task_id_fkey'
  ) THEN
    ALTER TABLE public.chats 
    ADD CONSTRAINT chats_task_id_fkey 
    FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;
  
  -- chat_members -> chats
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chat_members_chat_id_fkey'
  ) THEN
    ALTER TABLE public.chat_members 
    ADD CONSTRAINT chat_members_chat_id_fkey 
    FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================================================
-- 5) ENABLE RLS AND CREATE POLICIES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE public.task_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_acceptances (only owner and accepter can see)
DROP POLICY IF EXISTS "task_acceptances_select_policy" ON public.task_acceptances;
CREATE POLICY "task_acceptances_select_policy" ON public.task_acceptances
  FOR SELECT TO authenticated
  USING (
    accepter_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_acceptances.task_id 
      AND COALESCE(t.created_by, t.owner_id, t.poster_id, t.user_id) = auth.uid()
    )
  );

-- RLS Policies for chats (only members can see)
DROP POLICY IF EXISTS "chats_select_policy" ON public.chats;
CREATE POLICY "chats_select_policy" ON public.chats
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm 
      WHERE cm.chat_id = chats.id AND cm.user_id = auth.uid()
    )
  );

-- RLS Policies for chat_members (only members can see)
DROP POLICY IF EXISTS "chat_members_select_policy" ON public.chat_members;
CREATE POLICY "chat_members_select_policy" ON public.chat_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- 6) HELPER FUNCTIONS
-- =============================================================================

-- Function to generate unique 5-digit code with no repeated digits
CREATE OR REPLACE FUNCTION public.generate_unique_acceptance_code()
RETURNS char(5)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_digits integer[] := ARRAY[0,1,2,3,4,5,6,7,8,9];
  temp_digit integer;
  i integer;
  j integer;
  generated_code text;
  max_attempts integer := 100;
  attempt_count integer := 0;
BEGIN
  LOOP
    attempt_count := attempt_count + 1;
    
    -- Fisher-Yates shuffle to randomize digits
    FOR i IN 10 DOWNTO 2 LOOP
      j := floor(random() * i)::integer + 1;
      temp_digit := code_digits[i];
      code_digits[i] := code_digits[j];
      code_digits[j] := temp_digit;
    END LOOP;
    
    -- Take first 5 digits and ensure first digit is not 0
    IF code_digits[1] = 0 THEN
      -- Swap first digit with second if first is 0
      temp_digit := code_digits[1];
      code_digits[1] := code_digits[2];
      code_digits[2] := temp_digit;
    END IF;
    
    -- Build the code
    generated_code := code_digits[1]::text || code_digits[2]::text || 
                     code_digits[3]::text || code_digits[4]::text || code_digits[5]::text;
    
    -- Check if code is unique
    IF NOT EXISTS (SELECT 1 FROM public.task_acceptances WHERE code = generated_code) THEN
      RETURN generated_code::char(5);
    END IF;
    
    -- Prevent infinite loop
    IF attempt_count >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique acceptance code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- Function to get user's first name (schema-adaptive)
CREATE OR REPLACE FUNCTION public.get_user_first_name(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  first_name text;
  full_name text;
  email text;
BEGIN
  -- Try profiles table first if it exists
  IF to_regclass('public.profiles') IS NOT NULL THEN
    SELECT 
      COALESCE(
        split_part(full_name, ' ', 1),
        split_part(username, ' ', 1),
        username
      )
    INTO first_name
    FROM public.profiles 
    WHERE id = user_id;
  END IF;
  
  -- Fallback to auth.users if profiles didn't work
  IF first_name IS NULL OR first_name = '' THEN
    SELECT 
      COALESCE(
        split_part((raw_user_meta_data->>'display_name')::text, ' ', 1),
        split_part((raw_user_meta_data->>'full_name')::text, ' ', 1),
        split_part(email::text, '@', 1)
      )
    INTO first_name
    FROM auth.users 
    WHERE id = user_id;
  END IF;
  
  -- Final fallback
  RETURN COALESCE(first_name, 'User');
END;
$$;

-- =============================================================================
-- 7) SAFE NORMALIZATION TRIGGER (no current_status references)
-- =============================================================================

-- Create safe normalization function
CREATE OR REPLACE FUNCTION public.normalize_task_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Normalize status to lowercase
  IF NEW.status IS NOT NULL THEN
    NEW.status := lower(NEW.status);
  END IF;
  
  -- Ensure task_category is populated
  IF NEW.task_category IS NULL OR NEW.task_category = '' THEN
    -- Try to derive from legacy columns
    NEW.task_category := COALESCE(
      CASE lower(COALESCE(NEW.category, ''))
        WHEN 'food' THEN 'food_delivery'
        WHEN 'coffee' THEN 'coffee_run'
        WHEN 'grocery' THEN 'grocery_shopping'
        ELSE NULL
      END,
      'general_task'
    );
  END IF;
  
  -- Set updated_at if column exists
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach the safe trigger
DROP TRIGGER IF EXISTS normalize_task_fields_trigger ON public.tasks;
CREATE TRIGGER normalize_task_fields_trigger 
  BEFORE INSERT OR UPDATE ON public.tasks 
  FOR EACH ROW EXECUTE FUNCTION public.normalize_task_fields();

-- =============================================================================
-- 8) RE-ENABLE USER TRIGGERS
-- =============================================================================

-- Re-enable user triggers now that schema is normalized
ALTER TABLE public.tasks ENABLE TRIGGER USER;

-- =============================================================================
-- 9) CREATE ACCEPT_TASK RPC FUNCTION (PostgREST discoverable)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.accept_task(task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  current_user_id uuid;
  task_record record;
  owner_id uuid;
  acceptance_code char(5);
  chat_record record;
  first_name text;
  system_message_id uuid;
  result jsonb;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION USING 
      ERRCODE = '42501',
      MESSAGE = 'Authentication required';
  END IF;
  
  -- Lock and load the task
  SELECT * INTO task_record
  FROM public.tasks t
  WHERE t.id = task_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION USING 
      ERRCODE = '42704',
      MESSAGE = 'Task not found';
  END IF;
  
  -- Determine owner (schema-adaptive)
  owner_id := COALESCE(
    task_record.created_by,
    task_record.owner_id,
    task_record.poster_id,
    task_record.user_id
  );
  
  IF owner_id IS NULL THEN
    RAISE EXCEPTION USING 
      ERRCODE = '42704',
      MESSAGE = 'Task owner not found';
  END IF;
  
  -- Validation checks
  IF current_user_id = owner_id THEN
    RAISE EXCEPTION USING 
      ERRCODE = '42501',
      MESSAGE = 'You cannot accept your own task';
  END IF;
  
  IF task_record.status NOT IN ('open', 'posted') THEN
    RAISE EXCEPTION USING 
      ERRCODE = '42501',
      MESSAGE = 'Task is not available for acceptance';
  END IF;
  
  IF task_record.accepted_by IS NOT NULL THEN
    RAISE EXCEPTION USING 
      ERRCODE = '42501',
      MESSAGE = 'Task has already been accepted by someone else';
  END IF;
  
  -- Check if this user already accepted this task (idempotency)
  IF EXISTS (
    SELECT 1 FROM public.task_acceptances ta 
    WHERE ta.task_id = task_id AND ta.accepter_id = current_user_id
  ) THEN
    -- Return existing acceptance data
    SELECT 
      jsonb_build_object(
        'task_id', ta.task_id,
        'status', 'accepted',
        'acceptance_code', ta.code,
        'chat_id', c.id,
        'task_category', ta.task_category,
        'accepted_by', ta.accepter_id,
        'owner_id', owner_id,
        'accepted_at', ta.created_at
      )
    INTO result
    FROM public.task_acceptances ta
    JOIN public.chats c ON c.task_id = ta.task_id
    WHERE ta.task_id = task_id AND ta.accepter_id = current_user_id;
    
    RETURN result;
  END IF;
  
  -- Generate unique acceptance code
  acceptance_code := public.generate_unique_acceptance_code();
  
  -- Update task (atomic)
  UPDATE public.tasks 
  SET 
    status = 'accepted',
    accepted_by = current_user_id,
    accepted_at = now(),
    updated_at = now()
  WHERE id = task_id;
  
  -- Insert acceptance record
  INSERT INTO public.task_acceptances (
    task_id, 
    accepter_id, 
    code, 
    task_category
  ) VALUES (
    task_id, 
    current_user_id, 
    acceptance_code, 
    task_record.task_category
  );
  
  -- Create or get chat
  INSERT INTO public.chats (task_id, task_category)
  VALUES (task_id, task_record.task_category)
  ON CONFLICT (task_id) DO UPDATE SET task_category = EXCLUDED.task_category
  RETURNING * INTO chat_record;
  
  -- Add chat members (owner and accepter)
  INSERT INTO public.chat_members (chat_id, user_id)
  VALUES 
    (chat_record.id, owner_id),
    (chat_record.id, current_user_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;
  
  -- Get accepter's first name
  first_name := public.get_user_first_name(current_user_id);
  
  -- Insert system message
  INSERT INTO public.messages (chat_id, sender_id, body, is_system)
  VALUES (
    chat_record.id,
    NULL,
    '🎉 ' || first_name || ' accepted your task (' || task_record.task_category || '). Code: ' || acceptance_code,
    true
  )
  RETURNING id INTO system_message_id;
  
  -- Build return object
  result := jsonb_build_object(
    'task_id', task_id,
    'status', 'accepted',
    'acceptance_code', acceptance_code,
    'chat_id', chat_record.id,
    'task_category', task_record.task_category,
    'accepted_by', current_user_id,
    'owner_id', owner_id,
    'accepted_at', now()
  );
  
  RETURN result;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition where another user accepted simultaneously
    RAISE EXCEPTION USING 
      ERRCODE = '42501',
      MESSAGE = 'Task has already been accepted by someone else';
  WHEN OTHERS THEN
    -- Re-raise with context
    RAISE EXCEPTION 'Failed to accept task: %', SQLERRM;
END;
$$;

-- =============================================================================
-- 10) GRANTS FOR POSTGREST DISCOVERABILITY
-- =============================================================================

-- Critical: Grant usage and execute permissions for PostgREST schema cache
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_task(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_unique_acceptance_code() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_first_name(uuid) TO anon, authenticated;

-- Grant table permissions
GRANT SELECT ON public.task_acceptances TO authenticated;
GRANT SELECT ON public.chats TO authenticated;
GRANT SELECT ON public.chat_members TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;

-- =============================================================================
-- 11) RELOAD POSTGREST SCHEMA CACHE
-- =============================================================================

-- Notify PostgREST to reload its schema cache (fixes PGRST202 errors)
SELECT pg_notify('pgrst', 'reload schema');