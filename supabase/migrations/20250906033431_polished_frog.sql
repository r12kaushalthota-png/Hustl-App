/*
  # Remove task_current_status enum and add unique accept code system

  1. Changes
    - Drop task_current_status enum completely
    - Remove task_current_status column from tasks table
    - Remove last_status_update column from tasks table
    - Add user_accept_code column to store unique UUID when task is accepted
    - Update accept_task function to generate unique codes
    - Clean up any references to the old enum

  2. New System
    - When user accepts task: generate UUID and store in user_accept_code
    - Task acceptance is tracked via accepted_by + user_accept_code
    - Simpler status tracking without complex enum states

  3. Security
    - Maintain existing RLS policies
    - Keep atomic task acceptance logic
*/

-- Drop the task_current_status enum and related columns
DO $$
BEGIN
  -- Remove columns that use the enum
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'task_current_status'
  ) THEN
    ALTER TABLE tasks DROP COLUMN task_current_status;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'current_status'
  ) THEN
    ALTER TABLE tasks DROP COLUMN current_status;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'last_status_update'
  ) THEN
    ALTER TABLE tasks DROP COLUMN last_status_update;
  END IF;

  -- Drop the enum type
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_current_status') THEN
    DROP TYPE task_current_status CASCADE;
  END IF;
END $$;

-- Add user_accept_code column to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'user_accept_code'
  ) THEN
    ALTER TABLE tasks ADD COLUMN user_accept_code uuid DEFAULT NULL;
  END IF;
END $$;

-- Create index on user_accept_code for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_accept_code 
ON tasks (user_accept_code) 
WHERE user_accept_code IS NOT NULL;

-- Drop any existing accept_task functions
DROP FUNCTION IF EXISTS accept_task(uuid, uuid);
DROP FUNCTION IF EXISTS accept_task(uuid);

-- Create new accept_task function with unique code generation
CREATE OR REPLACE FUNCTION accept_task(
  p_task_id uuid,
  p_user_id uuid
) RETURNS TABLE(
  id uuid,
  title text,
  description text,
  category text,
  store text,
  dropoff_address text,
  dropoff_instructions text,
  urgency text,
  reward_cents integer,
  estimated_minutes integer,
  status task_status,
  created_by uuid,
  accepted_by uuid,
  user_accept_code uuid,
  created_at timestamptz,
  updated_at timestamptz,
  accepted_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_accept_code uuid;
BEGIN
  -- Generate unique accept code
  v_accept_code := gen_random_uuid();

  -- Lock and fetch the task atomically
  SELECT * INTO v_task
  FROM tasks t
  WHERE t.id = p_task_id
  FOR UPDATE;

  -- Validate task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND: Task not found or no longer available';
  END IF;

  -- Validate task is open
  IF v_task.status != 'open' THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED: Task was already accepted by another user';
  END IF;

  -- Validate user is not the creator
  IF v_task.created_by = p_user_id THEN
    RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK: You cannot accept your own task';
  END IF;

  -- Update task with acceptance details
  UPDATE tasks t SET
    status = 'accepted'::task_status,
    accepted_by = p_user_id,
    user_accept_code = v_accept_code,
    accepted_at = now(),
    updated_at = now()
  WHERE t.id = p_task_id;

  -- Return the updated task
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    t.category,
    t.store,
    t.dropoff_address,
    t.dropoff_instructions,
    t.urgency,
    t.reward_cents,
    t.estimated_minutes,
    t.status,
    t.created_by,
    t.accepted_by,
    t.user_accept_code,
    t.created_at,
    t.updated_at,
    t.accepted_at
  FROM tasks t
  WHERE t.id = p_task_id;
END;
$$;