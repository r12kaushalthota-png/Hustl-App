/*
  # Replace Accept Task System

  This migration completely replaces the accept-task flow with:
  
  1. Cleanup
     - Remove old accept_task functions and related artifacts
     - Clean up legacy columns and constraints
  
  2. New Schema
     - task_acceptances table with unique 5-digit codes
     - chats system with task_category tagging
     - chat_members and messages tables
  
  3. New RPC Function
     - accept_task(task_id uuid) with atomic operations
     - Generates unique 5-digit codes with no repeated digits
     - Creates/reuses chats automatically
     - Returns complete acceptance data
  
  4. Security
     - Proper RLS policies for all new tables
     - Maintains existing tasks security
*/

-- ============================================================================
-- 1. CLEANUP: Remove old accept-task artifacts
-- ============================================================================

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS public.accept_task(uuid);
DROP FUNCTION IF EXISTS public.accept_task(uuid, uuid);
DROP FUNCTION IF EXISTS public.accept_task_atomic(uuid);
DROP FUNCTION IF EXISTS public.accept_task_atomic(uuid, uuid);

-- Drop old tables if they exist
DROP TABLE IF EXISTS public.task_chats CASCADE;
DROP TABLE IF EXISTS public.task_acceptances_old CASCADE;

-- Remove legacy columns from tasks if they exist
DO $$
BEGIN
  -- Remove accept_code column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'accept_code'
  ) THEN
    ALTER TABLE tasks DROP COLUMN accept_code;
  END IF;
END $$;

-- ============================================================================
-- 2. SCHEMA: Create new tables with task_category support
-- ============================================================================

-- Ensure tasks table has required columns and constraints
DO $$
BEGIN
  -- Add task_category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'task_category'
  ) THEN
    ALTER TABLE tasks ADD COLUMN task_category text NOT NULL DEFAULT 'food_delivery';
  END IF;
  
  -- Add accepted_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'accepted_by'
  ) THEN
    ALTER TABLE tasks ADD COLUMN accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  -- Add accepted_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN accepted_at timestamptz;
  END IF;
END $$;

-- Update task_category check constraint
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'tasks' AND constraint_name = 'tasks_task_category_check'
  ) THEN
    ALTER TABLE tasks DROP CONSTRAINT tasks_task_category_check;
  END IF;
  
  -- Add new constraint with allowed categories
  ALTER TABLE tasks ADD CONSTRAINT tasks_task_category_check 
    CHECK (task_category IN (
      'food_delivery', 'coffee_run', 'grocery_shopping', 'library_pickup',
      'study_partner', 'workout_buddy', 'campus_ride', 'package_pickup',
      'dorm_essentials', 'lost_found', 'tutoring', 'event_buddy'
    ));
END $$;

-- Ensure status constraint includes 'accepted' (lowercase)
DO $$
BEGIN
  -- Drop existing status constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'tasks' AND constraint_name = 'tasks_status_check'
  ) THEN
    ALTER TABLE tasks DROP CONSTRAINT tasks_status_check;
  END IF;
  
  -- Add new status constraint
  ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
    CHECK (status IN ('open', 'accepted', 'completed', 'cancelled'));
END $$;

-- Create task_acceptances table
CREATE TABLE IF NOT EXISTS task_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  accepter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code char(5) NOT NULL UNIQUE,
  task_category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique index: one accepter per task
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_acceptances_task_id 
  ON task_acceptances(task_id);

-- Index for code lookups
CREATE INDEX IF NOT EXISTS idx_task_acceptances_code 
  ON task_acceptances(code);

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid UNIQUE NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  task_category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for task_id lookups
CREATE INDEX IF NOT EXISTS idx_chats_task_id 
  ON chats(task_id);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_chats_task_category 
  ON chats(task_category);

-- Create chat_members table
CREATE TABLE IF NOT EXISTS chat_members (
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

-- Index for user's chats
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id 
  ON chat_members(user_id);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for chat message ordering
CREATE INDEX IF NOT EXISTS idx_messages_chat_created 
  ON messages(chat_id, created_at);

-- ============================================================================
-- 3. RLS POLICIES: Secure access to new tables
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE task_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- task_acceptances policies
CREATE POLICY "task_acceptances_select_involved" ON task_acceptances
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
CREATE POLICY "chats_select_members" ON chats
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.chat_id = chats.id 
      AND chat_members.user_id = auth.uid()
    )
  );

-- chat_members policies
CREATE POLICY "chat_members_select_own" ON chat_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- messages policies
CREATE POLICY "messages_select_members" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.chat_id = messages.chat_id 
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert_members" ON messages
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
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to generate unique 5-digit code with no repeated digits
CREATE OR REPLACE FUNCTION generate_unique_accept_code()
RETURNS char(5)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  digits int[] := ARRAY[0,1,2,3,4,5,6,7,8,9];
  shuffled int[];
  code_str text;
  attempt int := 0;
  max_attempts int := 100;
BEGIN
  LOOP
    attempt := attempt + 1;
    
    -- Fisher-Yates shuffle
    shuffled := digits;
    FOR i IN REVERSE 10 DOWN TO 2 LOOP
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
    IF NOT EXISTS (SELECT 1 FROM task_acceptances WHERE code = code_str) THEN
      RETURN code_str::char(5);
    END IF;
    
    -- Safety valve
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique acceptance code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- Function to get user's first name from profiles
CREATE OR REPLACE FUNCTION get_user_first_name(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  first_name text;
BEGIN
  SELECT COALESCE(
    split_part(full_name, ' ', 1),
    split_part(username, ' ', 1),
    'User'
  ) INTO first_name
  FROM profiles 
  WHERE id = user_id;
  
  RETURN COALESCE(first_name, 'User');
END;
$$;

-- ============================================================================
-- 5. MAIN RPC FUNCTION: accept_task
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_task(task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  task_record record;
  acceptance_code char(5);
  chat_record record;
  owner_first_name text;
  accepter_first_name text;
  system_message text;
  result jsonb;
BEGIN
  -- Require authentication
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Lock and validate task
  SELECT * INTO task_record
  FROM tasks 
  WHERE id = task_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  
  -- Prevent self-acceptance
  IF task_record.created_by = current_user_id THEN
    RAISE EXCEPTION 'You cannot accept your own task';
  END IF;
  
  -- Check if task is available
  IF task_record.status NOT IN ('open') THEN
    IF task_record.status = 'accepted' THEN
      RAISE EXCEPTION 'This task was already accepted by someone else';
    ELSE
      RAISE EXCEPTION 'Task is no longer available';
    END IF;
  END IF;
  
  -- Check for existing acceptance (idempotency)
  SELECT ta.*, c.id as chat_id INTO acceptance_record
  FROM task_acceptances ta
  LEFT JOIN chats c ON c.task_id = ta.task_id
  WHERE ta.task_id = task_id AND ta.accepter_id = current_user_id;
  
  IF FOUND THEN
    -- Return existing acceptance
    RETURN jsonb_build_object(
      'task_id', task_id,
      'status', 'accepted',
      'acceptance_code', acceptance_record.code,
      'chat_id', acceptance_record.chat_id,
      'task_category', acceptance_record.task_category,
      'accepted_by', current_user_id,
      'owner_id', task_record.created_by,
      'accepted_at', acceptance_record.created_at
    );
  END IF;
  
  -- Generate unique acceptance code
  acceptance_code := generate_unique_accept_code();
  
  -- Update task status
  UPDATE tasks 
  SET 
    status = 'accepted',
    accepted_by = current_user_id,
    accepted_at = now(),
    updated_at = now()
  WHERE id = task_id;
  
  -- Create acceptance record
  INSERT INTO task_acceptances (
    task_id, 
    accepter_id, 
    code, 
    task_category
  ) VALUES (
    task_id,
    current_user_id,
    acceptance_code,
    task_record.category  -- Use existing category column
  );
  
  -- Create or get chat
  INSERT INTO chats (task_id, task_category)
  VALUES (task_id, task_record.category)
  ON CONFLICT (task_id) DO NOTHING;
  
  SELECT * INTO chat_record
  FROM chats 
  WHERE task_id = task_id;
  
  -- Ensure both users are chat members
  INSERT INTO chat_members (chat_id, user_id)
  VALUES 
    (chat_record.id, task_record.created_by),
    (chat_record.id, current_user_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;
  
  -- Get user names for system message
  accepter_first_name := get_user_first_name(current_user_id);
  owner_first_name := get_user_first_name(task_record.created_by);
  
  -- Create system message
  system_message := '🎉 ' || accepter_first_name || ' accepted your task (' || 
                   task_record.category || '). Code: ' || acceptance_code;
  
  INSERT INTO messages (chat_id, sender_id, body, is_system)
  VALUES (chat_record.id, NULL, system_message, true);
  
  -- Return complete result
  result := jsonb_build_object(
    'task_id', task_id,
    'status', 'accepted',
    'acceptance_code', acceptance_code,
    'chat_id', chat_record.id,
    'task_category', task_record.category,
    'accepted_by', current_user_id,
    'owner_id', task_record.created_by,
    'accepted_at', now()
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details for debugging
    RAISE EXCEPTION 'Task acceptance failed: %', SQLERRM;
END;
$$;