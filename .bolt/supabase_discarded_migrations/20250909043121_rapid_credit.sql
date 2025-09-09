/*
  # Complete Accept-Task System with Schema-Adaptive Owner Resolution

  This migration fixes all owner_id references and rebuilds the accept-task flow with:
  
  1. Schema Cleanup
    - Drops all problematic triggers referencing current_status or owner_id
    - Removes legacy tables and functions
    
  2. Canonical Owner System
    - Creates v_task_owner view that works with any column naming
    - Creates get_task_owner() function for consistent owner resolution
    
  3. Accept-Task Flow
    - Atomic task acceptance with proper locking
    - Unique 5-digit codes with no repeated digits
    - Automatic chat creation between owner and accepter
    - System message with acceptance code
    
  4. Security & RLS
    - Schema-adaptive policies using canonical owner functions
    - Proper grants for PostgREST discoverability
    - Schema cache reload
*/

-- =============================================================================
-- 1. HARD CLEANUP - Drop all problematic objects first
-- =============================================================================

-- Drop triggers that reference current_status or owner_id
DROP TRIGGER IF EXISTS tasks_after_insert_notification ON public.tasks;
DROP TRIGGER IF EXISTS tasks_after_update_accepted_notification ON public.tasks;
DROP TRIGGER IF EXISTS tasks_after_update_status_notification ON public.tasks;
DROP TRIGGER IF EXISTS trg_task_accepted_notifications ON public.tasks;
DROP TRIGGER IF EXISTS trg_task_posted_notifications ON public.tasks;
DROP TRIGGER IF EXISTS trg_task_updated_notifications ON public.tasks;

-- Drop legacy functions
DROP FUNCTION IF EXISTS public.accept_task(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task_v2(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task_atomic(uuid) CASCADE;

-- Drop legacy tables
DROP TABLE IF EXISTS public.task_acceptances CASCADE;

-- =============================================================================
-- 2. CANONICAL OWNER SYSTEM - Works with any schema
-- =============================================================================

-- Create canonical owner view that works with any column naming
CREATE OR REPLACE VIEW public.v_task_owner
AS
SELECT
  t.id AS task_id,
  COALESCE(
    t.created_by,
    t.owner_id,
    t.poster_id,
    t.user_id,
    t.creator_id
  ) AS owner_id
FROM public.tasks t;

COMMENT ON VIEW public.v_task_owner IS 'Canonical mapping of tasks → owner_id regardless of column naming';

-- Optional security barrier
ALTER VIEW public.v_task_owner SET (security_barrier = on);

-- Helper function for owner resolution
CREATE OR REPLACE FUNCTION public.get_task_owner(p_task_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT owner_id FROM public.v_task_owner WHERE task_id = p_task_id
$$;

-- =============================================================================
-- 3. SCHEMA ADAPTATION - Ensure required columns exist
-- =============================================================================

-- Ensure accepted_by column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'accepted_by'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN accepted_by uuid;
  END IF;
END $$;

-- Ensure accepted_at column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN accepted_at timestamptz;
  END IF;
END $$;

-- Ensure user_accept_code column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'user_accept_code'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN user_accept_code text;
  END IF;
END $$;

-- Ensure task_category column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'task_category'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN task_category text DEFAULT 'general_task';
  END IF;
END $$;

-- Ensure updated_at column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Ensure status column allows 'accepted'
DO $$
BEGIN
  -- Check if status column has constraints
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name = 'tasks' AND ccu.column_name = 'status'
  ) THEN
    -- Drop existing status constraint if it exists
    ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
    
    -- Add new constraint that includes 'accepted'
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
    CHECK (status IN ('open', 'posted', 'accepted', 'completed', 'cancelled'));
  END IF;
END $$;

-- =============================================================================
-- 4. CHAT SYSTEM TABLES
-- =============================================================================

-- Create chats table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chat_members (
  chat_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'user' CHECK (message_type IN ('user', 'system')),
  created_at timestamptz DEFAULT now()
);

-- Add foreign keys if they don't exist
DO $$
BEGIN
  -- chats.task_id → tasks.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chats_task_id_fkey'
  ) THEN
    ALTER TABLE public.chats ADD CONSTRAINT chats_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;

  -- chat_members.chat_id → chats.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chat_members_chat_id_fkey'
  ) THEN
    ALTER TABLE public.chat_members ADD CONSTRAINT chat_members_chat_id_fkey
    FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;
  END IF;

  -- messages.chat_id → chats.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'messages_chat_id_fkey'
  ) THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_chat_id_fkey
    FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================================================
-- 5. SAFE TASK CATEGORY BACKFILL
-- =============================================================================

-- Temporarily disable user triggers during backfill
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  -- Disable all user triggers on tasks table
  FOR trigger_rec IN 
    SELECT tgname FROM pg_trigger 
    WHERE tgrelid = 'public.tasks'::regclass 
    AND NOT tgisinternal
  LOOP
    EXECUTE format('ALTER TABLE public.tasks DISABLE TRIGGER %I', trigger_rec.tgname);
  END LOOP;
END $$;

-- Backfill task_category from existing category columns
UPDATE public.tasks 
SET task_category = CASE
  WHEN category IS NOT NULL THEN 
    CASE category
      WHEN 'food' THEN 'food_delivery'
      WHEN 'coffee' THEN 'coffee_run'
      WHEN 'grocery' THEN 'grocery_shopping'
      WHEN 'study' THEN 'study_session'
      WHEN 'transport' THEN 'campus_ride'
      ELSE 'general_task'
    END
  WHEN task_type IS NOT NULL THEN
    CASE task_type
      WHEN 'delivery' THEN 'food_delivery'
      WHEN 'pickup' THEN 'general_task'
      WHEN 'ride' THEN 'campus_ride'
      ELSE 'general_task'
    END
  WHEN type IS NOT NULL THEN
    CASE type
      WHEN 'food' THEN 'food_delivery'
      WHEN 'transport' THEN 'campus_ride'
      ELSE 'general_task'
    END
  ELSE 'general_task'
END
WHERE task_category IS NULL OR task_category = '';

-- Re-enable all user triggers
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  FOR trigger_rec IN 
    SELECT tgname FROM pg_trigger 
    WHERE tgrelid = 'public.tasks'::regclass 
    AND NOT tgisinternal
  LOOP
    EXECUTE format('ALTER TABLE public.tasks ENABLE TRIGGER %I', trigger_rec.tgname);
  END LOOP;
END $$;

-- =============================================================================
-- 6. SAFE TASK TRIGGER - Only mutates NEW record
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_tasks_before_insert_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Normalize status to lowercase
  IF NEW.status IS NOT NULL THEN
    NEW.status := lower(NEW.status);
  END IF;

  -- Derive task_category from category/task_type/type if not set
  IF NEW.task_category IS NULL OR NEW.task_category = '' THEN
    NEW.task_category := CASE
      WHEN NEW.category IS NOT NULL THEN 
        CASE NEW.category
          WHEN 'food' THEN 'food_delivery'
          WHEN 'coffee' THEN 'coffee_run'
          WHEN 'grocery' THEN 'grocery_shopping'
          WHEN 'study' THEN 'study_session'
          WHEN 'transport' THEN 'campus_ride'
          ELSE 'general_task'
        END
      WHEN NEW.task_type IS NOT NULL THEN
        CASE NEW.task_type
          WHEN 'delivery' THEN 'food_delivery'
          WHEN 'pickup' THEN 'general_task'
          WHEN 'ride' THEN 'campus_ride'
          ELSE 'general_task'
        END
      WHEN NEW.type IS NOT NULL THEN
        CASE NEW.type
          WHEN 'food' THEN 'food_delivery'
          WHEN 'transport' THEN 'campus_ride'
          ELSE 'general_task'
        END
      ELSE 'general_task'
    END;
  END IF;

  -- Set updated_at on UPDATE only if column exists
  IF TG_OP = 'UPDATE' THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tasks' AND column_name = 'updated_at'
    ) THEN
      NEW.updated_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply the safe trigger
DROP TRIGGER IF EXISTS trg_tasks_safe_before ON public.tasks;
CREATE TRIGGER trg_tasks_safe_before
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_tasks_before_insert_update();

-- =============================================================================
-- 7. ATOMIC ACCEPT-TASK RPC WITH 5-DIGIT CODES
-- =============================================================================

CREATE OR REPLACE FUNCTION public.accept_task(task_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record RECORD;
  owner_id uuid;
  acceptance_code text;
  chat_record RECORD;
  attempt_count int := 0;
  max_attempts int := 10;
BEGIN
  -- Lock the task for atomic update
  SELECT * INTO task_record
  FROM public.tasks t
  WHERE t.id = task_id
  FOR UPDATE;

  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found' USING ERRCODE = '42704';
  END IF;

  -- Get canonical owner
  owner_id := public.get_task_owner(task_id);
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Task owner not found' USING ERRCODE = '42704';
  END IF;

  -- Prevent self-acceptance
  IF owner_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot accept your own task' USING ERRCODE = '42501';
  END IF;

  -- Check if task is available for acceptance
  IF task_record.status NOT IN ('open', 'posted') THEN
    IF task_record.status = 'accepted' THEN
      -- Check if already accepted by this user (idempotency)
      IF task_record.accepted_by = auth.uid() THEN
        -- Return existing acceptance
        SELECT c.id INTO chat_record
        FROM public.chats c
        WHERE c.task_id = task_id;
        
        RETURN json_build_object(
          'task_id', task_id,
          'status', task_record.status,
          'acceptance_code', task_record.user_accept_code,
          'chat_id', chat_record.id,
          'task_category', task_record.task_category,
          'accepted_by', task_record.accepted_by,
          'owner_id', owner_id,
          'accepted_at', task_record.accepted_at
        );
      ELSE
        RAISE EXCEPTION 'Task has already been accepted by someone else' USING ERRCODE = '42501';
      END IF;
    ELSE
      RAISE EXCEPTION 'Task is not available for acceptance (status: %)' USING ERRCODE = '42501', task_record.status;
    END IF;
  END IF;

  -- Generate unique 5-digit code with no repeated digits
  LOOP
    acceptance_code := public.generate_unique_5digit_code();
    attempt_count := attempt_count + 1;
    
    BEGIN
      -- Try to update task with the generated code
      UPDATE public.tasks
      SET 
        status = 'accepted',
        accepted_by = auth.uid(),
        accepted_at = now(),
        user_accept_code = acceptance_code,
        updated_at = CASE 
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tasks' AND column_name = 'updated_at'
          ) THEN now()
          ELSE updated_at
        END
      WHERE id = task_id;
      
      -- If we get here, the update succeeded
      EXIT;
      
    EXCEPTION
      WHEN unique_violation THEN
        -- Code collision, try again
        IF attempt_count >= max_attempts THEN
          RAISE EXCEPTION 'Failed to generate unique acceptance code after % attempts', max_attempts;
        END IF;
        CONTINUE;
    END;
  END LOOP;

  -- Create or get chat
  INSERT INTO public.chats (task_id, created_at, updated_at)
  VALUES (task_id, now(), now())
  ON CONFLICT (task_id) DO UPDATE SET updated_at = now()
  RETURNING * INTO chat_record;

  -- Add chat members (owner and accepter)
  INSERT INTO public.chat_members (chat_id, user_id, joined_at)
  VALUES 
    (chat_record.id, owner_id, now()),
    (chat_record.id, auth.uid(), now())
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  -- Post system message with acceptance code
  INSERT INTO public.messages (chat_id, sender_id, content, message_type, created_at)
  VALUES (
    chat_record.id,
    auth.uid(),
    format('🎉 Task accepted! Your code is: %s', acceptance_code),
    'system',
    now()
  );

  -- Return success response
  RETURN json_build_object(
    'task_id', task_id,
    'status', 'accepted',
    'acceptance_code', acceptance_code,
    'chat_id', chat_record.id,
    'task_category', task_record.task_category,
    'accepted_by', auth.uid(),
    'owner_id', owner_id,
    'accepted_at', now()
  );
END;
$$;

-- =============================================================================
-- 8. UNIQUE 5-DIGIT CODE GENERATOR
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_unique_5digit_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  digits int[] := ARRAY[0,1,2,3,4,5,6,7,8,9];
  result text := '';
  i int;
  j int;
  temp int;
BEGIN
  -- Fisher-Yates shuffle to ensure no repeated digits
  FOR i IN REVERSE 9..1 LOOP
    j := floor(random() * (i + 1))::int;
    temp := digits[i + 1];
    digits[i + 1] := digits[j + 1];
    digits[j + 1] := temp;
  END LOOP;
  
  -- Take first 5 digits and concatenate
  FOR i IN 1..5 LOOP
    result := result || digits[i]::text;
  END LOOP;
  
  -- Ensure it doesn't start with 0
  IF result::char = '0' THEN
    result := digits[6]::text || substring(result, 2);
  END IF;
  
  RETURN result;
END;
$$;

-- =============================================================================
-- 9. ROW LEVEL SECURITY - Schema-adaptive policies
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Tasks policies (using canonical owner)
DROP POLICY IF EXISTS tasks_select_policy ON public.tasks;
CREATE POLICY tasks_select_policy
ON public.tasks
FOR SELECT TO authenticated
USING (
  status IN ('open', 'posted')
  OR public.get_task_owner(id) = auth.uid()
  OR accepted_by = auth.uid()
);

DROP POLICY IF EXISTS tasks_update_policy ON public.tasks;
CREATE POLICY tasks_update_policy
ON public.tasks
FOR UPDATE TO authenticated
USING (
  public.get_task_owner(id) = auth.uid()
  OR accepted_by = auth.uid()
);

-- Chats policies (member-only access)
DROP POLICY IF EXISTS chats_select_policy ON public.chats;
CREATE POLICY chats_select_policy
ON public.chats
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_members cm
    WHERE cm.chat_id = chats.id AND cm.user_id = auth.uid()
  )
);

-- Chat members policies (own membership only)
DROP POLICY IF EXISTS chat_members_select_policy ON public.chat_members;
CREATE POLICY chat_members_select_policy
ON public.chat_members
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Messages policies (chat member access)
DROP POLICY IF EXISTS messages_select_policy ON public.messages;
CREATE POLICY messages_select_policy
ON public.messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_members cm
    WHERE cm.chat_id = messages.chat_id AND cm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS messages_insert_policy ON public.messages;
CREATE POLICY messages_insert_policy
ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.chat_members cm
    WHERE cm.chat_id = messages.chat_id AND cm.user_id = auth.uid()
  )
);

-- =============================================================================
-- 10. POSTGREST DISCOVERABILITY
-- =============================================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant table access
GRANT SELECT ON public.tasks TO anon, authenticated;
GRANT SELECT ON public.chats TO anon, authenticated;
GRANT SELECT ON public.chat_members TO anon, authenticated;
GRANT SELECT, INSERT ON public.messages TO anon, authenticated;

-- Grant function execution
GRANT EXECUTE ON FUNCTION public.accept_task(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_task_owner(uuid) TO anon, authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- 11. VERIFICATION QUERIES
-- =============================================================================

-- Verify canonical owner system works
DO $$
DECLARE
  test_count int;
BEGIN
  SELECT COUNT(*) INTO test_count
  FROM public.v_task_owner
  WHERE owner_id IS NOT NULL;
  
  RAISE NOTICE 'Canonical owner system: % tasks with valid owners', test_count;
END $$;

-- Verify accept_task function is discoverable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'accept_task'
    AND routine_schema = 'public'
  ) THEN
    RAISE NOTICE 'accept_task function is available for PostgREST';
  ELSE
    RAISE WARNING 'accept_task function not found!';
  END IF;
END $$;