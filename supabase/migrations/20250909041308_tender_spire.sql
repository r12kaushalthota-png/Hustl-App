/*
  # Rebuild Accept Task Flow End-to-End

  This migration completely rebuilds the task acceptance system with:
  1. Schema cleanup and adaptation
  2. Atomic task acceptance with unique 5-digit codes
  3. Automatic chat creation
  4. Proper PostgREST function registration
  5. Comprehensive RLS policies

  ## Changes Made
  1. **Cleanup**: Removes all old accept-task artifacts
  2. **Schema**: Adapts existing tables and creates missing ones
  3. **RPC**: Creates discoverable accept_task function
  4. **Security**: Implements proper RLS policies
  5. **Chat**: Auto-creates 1-to-1 chats with system messages
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 0) CLEANUP: Drop old accept-task artifacts (idempotent)
-- ============================================================================

-- Drop old functions with any signature
DROP FUNCTION IF EXISTS public.accept_task(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task(text) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task(json) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task(jsonb) CASCADE;
DROP FUNCTION IF EXISTS accept_task(uuid) CASCADE;
DROP FUNCTION IF EXISTS accept_task(text) CASCADE;

-- Drop old triggers that might reference current_status
DROP TRIGGER IF EXISTS tasks_status_trigger ON tasks;
DROP TRIGGER IF EXISTS update_task_status ON tasks;
DROP TRIGGER IF EXISTS normalize_task_status ON tasks;

-- Drop old types
DROP TYPE IF EXISTS accepted_task_result CASCADE;
DROP TYPE IF EXISTS task_acceptance_result CASCADE;

-- Drop legacy tables (preserve data by renaming if they exist)
DO $$
BEGIN
  -- Rename legacy tables instead of dropping to preserve data
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_chats' AND table_schema = 'public') THEN
    ALTER TABLE task_chats RENAME TO legacy_task_chats;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'legacy_task_acceptances' AND table_schema = 'public') THEN
    DROP TABLE legacy_task_acceptances CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 1) SCHEMA ADAPTATION: Normalize existing tables
-- ============================================================================

-- Ensure tasks table has required columns
DO $$
BEGIN
  -- Add accepted_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'accepted_by'
  ) THEN
    ALTER TABLE tasks ADD COLUMN accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Add accepted_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN accepted_at timestamptz;
  END IF;

  -- Ensure task_category exists (map from category if needed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'task_category'
  ) THEN
    -- Check if we have a category column to map from
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'category'
    ) THEN
      ALTER TABLE tasks ADD COLUMN task_category text;
      UPDATE tasks SET task_category = COALESCE(category, 'general_task') WHERE task_category IS NULL;
      ALTER TABLE tasks ALTER COLUMN task_category SET NOT NULL;
      ALTER TABLE tasks ALTER COLUMN task_category SET DEFAULT 'general_task';
    ELSE
      ALTER TABLE tasks ADD COLUMN task_category text NOT NULL DEFAULT 'general_task';
    END IF;
  END IF;
END $$;

-- Ensure status column supports 'accepted' (lowercase)
DO $$
BEGIN
  -- If status is an enum, add 'accepted' if missing
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'status' AND data_type = 'USER-DEFINED'
  ) THEN
    -- Add 'accepted' to enum if not present
    BEGIN
      ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'accepted';
    EXCEPTION WHEN duplicate_object THEN
      -- Value already exists, continue
    END;
  END IF;
  
  -- If status is text with check constraint, update it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'tasks' AND tc.constraint_type = 'CHECK' 
    AND cc.check_clause LIKE '%status%'
  ) THEN
    -- Drop old check constraint and add new one
    ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
    ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
      CHECK (status = ANY (ARRAY['open'::text, 'accepted'::text, 'completed'::text, 'cancelled'::text]));
  END IF;
END $$;

-- Add task_category check constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_category_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_task_category_check 
  CHECK (task_category = ANY (ARRAY[
    'food_delivery'::text, 'coffee_run'::text, 'grocery_shopping'::text, 
    'library_pickup'::text, 'study_session'::text, 'campus_ride'::text,
    'general_task'::text, 'food'::text, 'coffee'::text, 'grocery'::text
  ]));

-- ============================================================================
-- 2) CREATE NEW TABLES
-- ============================================================================

-- Task acceptances table (stores unique codes)
CREATE TABLE IF NOT EXISTS task_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  accepter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code char(5) NOT NULL UNIQUE,
  task_category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure unique constraint on task_id (one accepter per task)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'task_acceptances_task_id_key'
  ) THEN
    ALTER TABLE task_acceptances ADD CONSTRAINT task_acceptances_task_id_key UNIQUE (task_id);
  END IF;
END $$;

-- Adapt existing chat_rooms to chats (or create if missing)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'chat_rooms' AND table_schema = 'public'
  ) THEN
    -- Rename chat_rooms to chats if needed
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'chats' AND table_schema = 'public'
    ) THEN
      ALTER TABLE chat_rooms RENAME TO chats;
    END IF;
  ELSE
    -- Create chats table
    CREATE TABLE IF NOT EXISTS chats (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id uuid UNIQUE NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      task_category text NOT NULL DEFAULT 'general_task',
      created_at timestamptz DEFAULT now()
    );
  END IF;
  
  -- Ensure task_category column exists in chats
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chats' AND column_name = 'task_category'
  ) THEN
    ALTER TABLE chats ADD COLUMN task_category text NOT NULL DEFAULT 'general_task';
  END IF;
END $$;

-- Adapt existing chat_members (rename conversation_id to chat_id if needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'chat_members' AND table_schema = 'public'
  ) THEN
    -- Check if we need to rename conversation_id to chat_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'chat_members' AND column_name = 'room_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'chat_members' AND column_name = 'chat_id'
    ) THEN
      ALTER TABLE chat_members RENAME COLUMN room_id TO chat_id;
    END IF;
  ELSE
    -- Create chat_members table
    CREATE TABLE IF NOT EXISTS chat_members (
      chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      unread_count integer NOT NULL DEFAULT 0,
      last_read_at timestamptz,
      PRIMARY KEY (chat_id, user_id)
    );
  END IF;
END $$;

-- Adapt existing chat_messages to messages (rename room_id to chat_id if needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'chat_messages' AND table_schema = 'public'
  ) THEN
    -- Rename to messages if needed
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'messages' AND table_schema = 'public'
    ) THEN
      ALTER TABLE chat_messages RENAME TO messages;
    END IF;
    
    -- Rename room_id to chat_id if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'room_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'chat_id'
    ) THEN
      ALTER TABLE messages RENAME COLUMN room_id TO chat_id;
    END IF;
    
    -- Rename text to body if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'text'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'body'
    ) THEN
      ALTER TABLE messages RENAME COLUMN text TO body;
    END IF;
  ELSE
    -- Create messages table
    CREATE TABLE IF NOT EXISTS messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      body text NOT NULL,
      is_system boolean NOT NULL DEFAULT false,
      created_at timestamptz DEFAULT now()
    );
  END IF;
  
  -- Add is_system column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'is_system'
  ) THEN
    ALTER TABLE messages ADD COLUMN is_system boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- 3) RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE task_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- task_acceptances policies
DROP POLICY IF EXISTS "task_acceptances_select_policy" ON task_acceptances;
CREATE POLICY "task_acceptances_select_policy" ON task_acceptances
  FOR SELECT TO authenticated
  USING (
    accepter_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_acceptances.task_id 
      AND tasks.created_by = auth.uid()
    )
  );

-- chats policies
DROP POLICY IF EXISTS "chats_select_policy" ON chats;
CREATE POLICY "chats_select_policy" ON chats
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.chat_id = chats.id 
      AND chat_members.user_id = auth.uid()
    )
  );

-- chat_members policies
DROP POLICY IF EXISTS "chat_members_select_policy" ON chat_members;
CREATE POLICY "chat_members_select_policy" ON chat_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "chat_members_update_policy" ON chat_members;
CREATE POLICY "chat_members_update_policy" ON chat_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- messages policies
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
CREATE POLICY "messages_select_policy" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.chat_id = messages.chat_id 
      AND chat_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
CREATE POLICY "messages_insert_policy" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.chat_id = messages.chat_id 
      AND chat_members.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4) HELPER FUNCTIONS
-- ============================================================================

-- Function to generate unique 5-digit code with no repeated digits
CREATE OR REPLACE FUNCTION generate_unique_acceptance_code()
RETURNS char(5)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_digits integer[];
  final_code text;
  attempt_count integer := 0;
  max_attempts integer := 100;
BEGIN
  LOOP
    attempt_count := attempt_count + 1;
    
    -- Exit if too many attempts
    IF attempt_count > max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique acceptance code after % attempts', max_attempts;
    END IF;
    
    -- Generate array of digits 0-9 and shuffle using Fisher-Yates
    code_digits := ARRAY[0,1,2,3,4,5,6,7,8,9];
    
    -- Fisher-Yates shuffle
    FOR i IN REVERSE 10 DOWN TO 2 LOOP
      DECLARE
        j integer := 1 + floor(random() * i)::integer;
        temp integer;
      BEGIN
        temp := code_digits[i];
        code_digits[i] := code_digits[j];
        code_digits[j] := temp;
      END;
    END LOOP;
    
    -- Take first 5 digits and convert to string
    final_code := '';
    FOR i IN 1..5 LOOP
      final_code := final_code || code_digits[i]::text;
    END LOOP;
    
    -- Check if code is unique
    IF NOT EXISTS (SELECT 1 FROM task_acceptances WHERE code = final_code) THEN
      RETURN final_code::char(5);
    END IF;
  END LOOP;
END;
$$;

-- Function to get user's first name
CREATE OR REPLACE FUNCTION get_user_first_name(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  first_name text;
BEGIN
  -- Try to get from profiles table
  SELECT COALESCE(
    split_part(full_name, ' ', 1),
    split_part(username, ' ', 1),
    'User'
  ) INTO first_name
  FROM profiles 
  WHERE id = user_id;
  
  -- Fallback to auth metadata if profiles doesn't exist or no data
  IF first_name IS NULL OR first_name = '' THEN
    SELECT COALESCE(
      split_part(raw_user_meta_data->>'display_name', ' ', 1),
      split_part(raw_user_meta_data->>'full_name', ' ', 1),
      'User'
    ) INTO first_name
    FROM auth.users 
    WHERE id = user_id;
  END IF;
  
  RETURN COALESCE(first_name, 'User');
END;
$$;

-- ============================================================================
-- 5) MAIN RPC FUNCTION: accept_task
-- ============================================================================

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
  accepter_first_name text;
  system_message text;
  result jsonb;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Lock and validate task
  SELECT * INTO task_record
  FROM tasks 
  WHERE id = task_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found' USING ERRCODE = '42704';
  END IF;
  
  -- Determine owner (adapt to different column names)
  owner_id := COALESCE(
    task_record.created_by,
    task_record.owner_id,
    task_record.poster_id,
    task_record.user_id
  );
  
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Task owner not found' USING ERRCODE = '42704';
  END IF;
  
  -- Validation checks
  IF current_user_id = owner_id THEN
    RAISE EXCEPTION 'You cannot accept your own task' USING ERRCODE = '42501';
  END IF;
  
  IF task_record.status NOT IN ('open', 'posted') THEN
    RAISE EXCEPTION 'Task is not available for acceptance' USING ERRCODE = '42501';
  END IF;
  
  IF task_record.accepted_by IS NOT NULL THEN
    RAISE EXCEPTION 'Task has already been accepted by another user' USING ERRCODE = '42501';
  END IF;

  -- Check if user already accepted this task (idempotency)
  IF EXISTS (
    SELECT 1 FROM task_acceptances 
    WHERE task_id = accept_task.task_id AND accepter_id = current_user_id
  ) THEN
    -- Return existing acceptance
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
      ) INTO result
    FROM task_acceptances ta
    JOIN chats c ON c.task_id = ta.task_id
    WHERE ta.task_id = accept_task.task_id AND ta.accepter_id = current_user_id;
    
    RETURN result;
  END IF;

  -- Update task status
  UPDATE tasks 
  SET 
    status = 'accepted',
    accepted_by = current_user_id,
    accepted_at = now(),
    updated_at = now()
  WHERE id = task_id;

  -- Generate unique acceptance code
  acceptance_code := generate_unique_acceptance_code();

  -- Insert task acceptance record
  INSERT INTO task_acceptances (task_id, accepter_id, code, task_category)
  VALUES (task_id, current_user_id, acceptance_code, task_record.task_category);

  -- Create or get chat
  INSERT INTO chats (task_id, task_category)
  VALUES (task_id, task_record.task_category)
  ON CONFLICT (task_id) DO UPDATE SET
    task_category = EXCLUDED.task_category
  RETURNING * INTO chat_record;

  -- Ensure both users are chat members
  INSERT INTO chat_members (chat_id, user_id)
  VALUES 
    (chat_record.id, owner_id),
    (chat_record.id, current_user_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  -- Get accepter's first name
  accepter_first_name := get_user_first_name(current_user_id);

  -- Create system message
  system_message := format(
    '🎉 %s accepted your task (%s). Code: %s',
    accepter_first_name,
    task_record.task_category,
    acceptance_code
  );

  INSERT INTO messages (chat_id, sender_id, body, is_system)
  VALUES (chat_record.id, NULL, system_message, true);

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
END;
$$;

-- ============================================================================
-- 6) GRANTS AND SCHEMA CACHE RELOAD
-- ============================================================================

-- Grant usage on schema to ensure PostgREST can discover functions
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant execute on the function to both anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.accept_task(uuid) TO anon, authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION generate_unique_acceptance_code() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_first_name(uuid) TO anon, authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- 7) SAFE TRIGGER FOR STATUS NORMALIZATION
-- ============================================================================

-- Create trigger to normalize status and task_category
CREATE OR REPLACE FUNCTION normalize_task_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Normalize status to lowercase
  NEW.status := lower(NEW.status);
  
  -- Ensure task_category is set
  IF NEW.task_category IS NULL OR NEW.task_category = '' THEN
    NEW.task_category := COALESCE(NEW.category, 'general_task');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger
DROP TRIGGER IF EXISTS normalize_task_fields_trigger ON tasks;
CREATE TRIGGER normalize_task_fields_trigger
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION normalize_task_fields();

-- ============================================================================
-- 8) INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for task_acceptances
CREATE INDEX IF NOT EXISTS idx_task_acceptances_task_id ON task_acceptances(task_id);
CREATE INDEX IF NOT EXISTS idx_task_acceptances_accepter_id ON task_acceptances(accepter_id);
CREATE INDEX IF NOT EXISTS idx_task_acceptances_code ON task_acceptances(code);

-- Indexes for chats
CREATE INDEX IF NOT EXISTS idx_chats_task_id ON chats(task_id);
CREATE INDEX IF NOT EXISTS idx_chats_task_category ON chats(task_category);

-- Indexes for chat_members
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);