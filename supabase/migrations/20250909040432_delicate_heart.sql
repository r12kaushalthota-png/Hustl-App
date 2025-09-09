/*
  # Replace Accept Task System - Comprehensive Implementation

  This migration completely replaces the accept-task flow with:
  1. Schema-adaptive table detection and creation
  2. Atomic task acceptance with unique 5-digit codes
  3. Automatic chat creation between task owner and accepter
  4. Proper RLS policies for security
  5. Complete cleanup of old artifacts

  ## Changes Made
  1. **Cleanup**: Removed all old accept-task functions and legacy artifacts
  2. **Schema**: Created/adapted tables for tasks, acceptances, chats, members, messages
  3. **Security**: Implemented comprehensive RLS policies
  4. **RPC**: New atomic accept_task function with code generation and chat creation
  5. **Constraints**: Added proper checks and unique constraints
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 0) CLEANUP: Drop old accept-task artifacts (idempotent)
-- ============================================================================

-- Drop old functions
DROP FUNCTION IF EXISTS public.accept_task(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task_atomic(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task_atomic(uuid, uuid) CASCADE;

-- Drop legacy tables
DROP TABLE IF EXISTS public.task_chats CASCADE;
DROP TABLE IF EXISTS public.task_acceptances_old CASCADE;
DROP TABLE IF EXISTS public.legacy_acceptances CASCADE;

-- Drop legacy triggers and indexes
DROP TRIGGER IF EXISTS trg_task_acceptance ON public.tasks;
DROP INDEX IF EXISTS idx_tasks_accept_code;
DROP INDEX IF EXISTS idx_task_acceptances_code;

-- Remove legacy columns (if they exist)
DO $$
BEGIN
  -- Remove legacy accept_code column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'accept_code'
  ) THEN
    ALTER TABLE public.tasks DROP COLUMN accept_code;
  END IF;
END $$;

-- ============================================================================
-- 1) SCHEMA ADAPTATION: Detect existing tables and create canonical mapping
-- ============================================================================

-- Ensure tasks table has required columns
DO $$
BEGIN
  -- Add task_category if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'task_category'
  ) THEN
    -- Map from existing category column or set default
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tasks' AND column_name = 'category'
    ) THEN
      ALTER TABLE public.tasks ADD COLUMN task_category text;
      UPDATE public.tasks SET task_category = 
        CASE 
          WHEN category = 'food' THEN 'food_delivery'
          WHEN category = 'coffee' THEN 'coffee_run'
          WHEN category = 'grocery' THEN 'grocery_shopping'
          ELSE 'general_task'
        END;
      ALTER TABLE public.tasks ALTER COLUMN task_category SET NOT NULL;
    ELSE
      ALTER TABLE public.tasks ADD COLUMN task_category text NOT NULL DEFAULT 'general_task';
    END IF;
  END IF;

  -- Add accepted_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'accepted_by'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Add accepted_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN accepted_at timestamptz;
  END IF;
END $$;

-- Update tasks status constraint to include 'accepted' (lowercase)
DO $$
BEGIN
  -- Drop existing status constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'tasks' AND constraint_name = 'tasks_status_check'
  ) THEN
    ALTER TABLE public.tasks DROP CONSTRAINT tasks_status_check;
  END IF;
  
  -- Add new status constraint with 'accepted'
  ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
    CHECK (status = ANY (ARRAY['open'::text, 'accepted'::text, 'completed'::text, 'cancelled'::text]));
END $$;

-- Add task_category constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'tasks' AND constraint_name = 'tasks_task_category_check'
  ) THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_task_category_check 
      CHECK (task_category = ANY (ARRAY[
        'food_delivery'::text, 
        'coffee_run'::text, 
        'grocery_shopping'::text, 
        'library_pickup'::text,
        'study_session'::text,
        'campus_ride'::text,
        'general_task'::text
      ]));
  END IF;
END $$;

-- ============================================================================
-- 2) CREATE NEW TABLES (schema-adaptive)
-- ============================================================================

-- Task acceptances table (stores unique codes)
CREATE TABLE IF NOT EXISTS public.task_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  accepter_id uuid NOT NULL,
  code char(5) NOT NULL UNIQUE,
  task_category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT task_acceptances_task_id_fkey 
    FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
  CONSTRAINT task_acceptances_accepter_id_fkey 
    FOREIGN KEY (accepter_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT task_acceptances_task_id_unique 
    UNIQUE (task_id)
);

-- Chats table (adapt to existing or create new)
DO $$
BEGIN
  -- Check if chats table exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chats') THEN
    -- Check for alternative names
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
      -- Use conversations table but ensure it has required columns
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'task_category'
      ) THEN
        ALTER TABLE public.conversations ADD COLUMN task_category text;
      END IF;
      
      -- Create view for consistent naming
      CREATE OR REPLACE VIEW public.chats AS 
      SELECT id, task_id, task_category, created_at 
      FROM public.conversations;
    ELSE
      -- Create new chats table
      CREATE TABLE public.chats (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id uuid UNIQUE,
        task_category text NOT NULL,
        created_at timestamptz DEFAULT now(),
        
        CONSTRAINT chats_task_id_fkey 
          FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE
      );
    END IF;
  ELSE
    -- Chats table exists, ensure it has task_category
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'chats' AND column_name = 'task_category'
    ) THEN
      ALTER TABLE public.chats ADD COLUMN task_category text;
    END IF;
  END IF;
END $$;

-- Chat members table (adapt to existing or create new)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_members') THEN
    -- Check for alternative names
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_members') THEN
      -- Rename if possible or create view
      CREATE OR REPLACE VIEW public.chat_members AS 
      SELECT 
        conversation_id as chat_id,
        user_id
      FROM public.conversation_members;
    ELSE
      -- Create new chat_members table
      CREATE TABLE public.chat_members (
        chat_id uuid NOT NULL,
        user_id uuid NOT NULL,
        joined_at timestamptz DEFAULT now(),
        
        PRIMARY KEY (chat_id, user_id),
        CONSTRAINT chat_members_chat_id_fkey 
          FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE,
        CONSTRAINT chat_members_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
      );
    END IF;
  END IF;
END $$;

-- Messages table (adapt to existing or create new)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    -- Check for alternative names
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
      -- Ensure chat_messages has required columns
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'is_system'
      ) THEN
        ALTER TABLE public.chat_messages ADD COLUMN is_system boolean NOT NULL DEFAULT false;
      END IF;
      
      -- Create view for consistent naming
      CREATE OR REPLACE VIEW public.messages AS 
      SELECT 
        id,
        room_id as chat_id,
        sender_id,
        text as body,
        is_system,
        created_at
      FROM public.chat_messages;
    ELSE
      -- Create new messages table
      CREATE TABLE public.messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id uuid NOT NULL,
        sender_id uuid,
        body text NOT NULL,
        is_system boolean NOT NULL DEFAULT false,
        created_at timestamptz DEFAULT now(),
        
        CONSTRAINT messages_chat_id_fkey 
          FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE,
        CONSTRAINT messages_sender_id_fkey 
          FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL
      );
    END IF;
  ELSE
    -- Messages table exists, ensure it has required columns
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'messages' AND column_name = 'is_system'
    ) THEN
      ALTER TABLE public.messages ADD COLUMN is_system boolean NOT NULL DEFAULT false;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 3) INDEXES for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_task_acceptances_task_id ON public.task_acceptances(task_id);
CREATE INDEX IF NOT EXISTS idx_task_acceptances_accepter_id ON public.task_acceptances(accepter_id);
CREATE INDEX IF NOT EXISTS idx_task_acceptances_code ON public.task_acceptances(code);
CREATE INDEX IF NOT EXISTS idx_chats_task_id ON public.chats(task_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON public.chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created ON public.messages(chat_id, created_at DESC);

-- ============================================================================
-- 4) RLS POLICIES (tight security)
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.task_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

-- Handle messages table RLS (might be existing chat_messages)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Task acceptances policies
CREATE POLICY "task_acceptances_select_participants" ON public.task_acceptances
  FOR SELECT TO authenticated
  USING (
    accepter_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_acceptances.task_id 
      AND tasks.created_by = auth.uid()
    )
  );

-- Chats policies
CREATE POLICY "chats_select_members" ON public.chats
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members 
      WHERE chat_members.chat_id = chats.id 
      AND chat_members.user_id = auth.uid()
    )
  );

-- Chat members policies
CREATE POLICY "chat_members_select_own" ON public.chat_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Messages policies (handle both direct table and view)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    CREATE POLICY "messages_select_members" ON public.messages
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.chat_members 
          WHERE chat_members.chat_id = messages.chat_id 
          AND chat_members.user_id = auth.uid()
        )
      );
      
    CREATE POLICY "messages_insert_members" ON public.messages
      FOR INSERT TO authenticated
      WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM public.chat_members 
          WHERE chat_members.chat_id = messages.chat_id 
          AND chat_members.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 5) HELPER FUNCTIONS
-- ============================================================================

-- Function to generate unique 5-digit code with no repeated digits
CREATE OR REPLACE FUNCTION generate_unique_acceptance_code()
RETURNS char(5)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  digits int[] := ARRAY[0,1,2,3,4,5,6,7,8,9];
  shuffled int[];
  code_str text;
  attempt int := 0;
  max_attempts int := 50;
BEGIN
  LOOP
    attempt := attempt + 1;
    
    -- Shuffle digits array using Fisher-Yates algorithm
    shuffled := digits;
    FOR i IN REVERSE 10..2 LOOP
      DECLARE
        j int := 1 + floor(random() * i)::int;
        temp int := shuffled[i];
      BEGIN
        shuffled[i] := shuffled[j];
        shuffled[j] := temp;
      END;
    END LOOP;
    
    -- Take first 5 digits and convert to string
    code_str := '';
    FOR i IN 1..5 LOOP
      code_str := code_str || shuffled[i]::text;
    END LOOP;
    
    -- Check if code is unique
    IF NOT EXISTS (
      SELECT 1 FROM public.task_acceptances WHERE code = code_str
    ) THEN
      RETURN code_str::char(5);
    END IF;
    
    -- Prevent infinite loop
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique acceptance code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- Function to get user's first name from profile
CREATE OR REPLACE FUNCTION get_user_first_name(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  first_name text;
BEGIN
  SELECT 
    COALESCE(
      split_part(full_name, ' ', 1),
      split_part(username, ' ', 1),
      'Someone'
    )
  INTO first_name
  FROM public.profiles 
  WHERE id = user_id;
  
  RETURN COALESCE(first_name, 'Someone');
END;
$$;

-- ============================================================================
-- 6) MAIN RPC FUNCTION: accept_task(task_id uuid) returns jsonb
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_task(task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  task_record record;
  owner_id uuid;
  acceptance_code char(5);
  chat_record record;
  accepter_first_name text;
  system_message text;
  result jsonb;
BEGIN
  -- 1) Auth & validation
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 2) Lock and load task
  SELECT * INTO task_record
  FROM public.tasks 
  WHERE id = task_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or no longer available';
  END IF;
  
  -- Determine owner (schema-adaptive)
  owner_id := COALESCE(
    task_record.created_by,
    task_record.owner_id,
    task_record.poster_id,
    task_record.user_id
  );
  
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Task owner not found';
  END IF;

  -- 3) Business logic validation
  IF current_user_id = owner_id THEN
    RAISE EXCEPTION 'You cannot accept your own task';
  END IF;
  
  IF task_record.status NOT IN ('open', 'posted') THEN
    RAISE EXCEPTION 'Task is no longer available for acceptance';
  END IF;
  
  IF task_record.accepted_by IS NOT NULL THEN
    RAISE EXCEPTION 'This task has already been accepted by another user';
  END IF;

  -- 4) Check for existing acceptance (idempotency)
  SELECT * INTO acceptance_code
  FROM public.task_acceptances 
  WHERE task_id = task_id AND accepter_id = current_user_id;
  
  IF FOUND THEN
    -- Return existing acceptance
    SELECT c.id INTO chat_record
    FROM public.chats c
    WHERE c.task_id = task_id;
    
    RETURN jsonb_build_object(
      'task_id', task_id,
      'status', 'accepted',
      'acceptance_code', acceptance_code,
      'chat_id', chat_record.id,
      'task_category', task_record.task_category,
      'accepted_by', current_user_id,
      'owner_id', owner_id,
      'accepted_at', task_record.accepted_at
    );
  END IF;

  -- 5) Assign task
  UPDATE public.tasks 
  SET 
    accepted_by = current_user_id,
    accepted_at = now(),
    status = 'accepted',
    updated_at = now()
  WHERE id = task_id;

  -- 6) Generate unique acceptance code
  acceptance_code := generate_unique_acceptance_code();

  -- 7) Insert acceptance record
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

  -- 8) Create or reuse chat
  INSERT INTO public.chats (task_id, task_category)
  VALUES (task_id, task_record.task_category)
  ON CONFLICT (task_id) DO UPDATE SET
    task_category = EXCLUDED.task_category
  RETURNING * INTO chat_record;

  -- 9) Ensure both users are chat members
  INSERT INTO public.chat_members (chat_id, user_id)
  VALUES 
    (chat_record.id, owner_id),
    (chat_record.id, current_user_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  -- 10) Get accepter's first name
  accepter_first_name := get_user_first_name(current_user_id);

  -- 11) Insert system message
  system_message := format(
    '🎉 %s accepted your task (%s). Code: %s',
    accepter_first_name,
    task_record.task_category,
    acceptance_code
  );

  INSERT INTO public.messages (chat_id, sender_id, body, is_system)
  VALUES (chat_record.id, NULL, system_message, true);

  -- 12) Return success payload
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
  WHEN OTHERS THEN
    -- Log error details for debugging
    RAISE EXCEPTION 'Task acceptance failed: %', SQLERRM;
END;
$$;

-- ============================================================================
-- 7) GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permission on RPC function
GRANT EXECUTE ON FUNCTION public.accept_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_unique_acceptance_code() TO service_role;
GRANT EXECUTE ON FUNCTION get_user_first_name(uuid) TO service_role;

-- Grant table permissions
GRANT SELECT ON public.task_acceptances TO authenticated;
GRANT SELECT ON public.chats TO authenticated;
GRANT SELECT ON public.chat_members TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    GRANT SELECT, INSERT ON public.messages TO authenticated;
  END IF;
END $$;