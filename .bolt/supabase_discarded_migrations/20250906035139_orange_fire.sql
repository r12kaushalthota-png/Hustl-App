/*
  # Clean Task Acceptance System

  This migration removes all old task status complexity and creates a simple system for:
  1. Task acceptance with unique code generation
  2. Basic task assignment to users

  ## What this migration does:
  1. Drops all old task status enums and functions
  2. Removes outdated columns related to complex task status
  3. Adds user_accept_code column for unique codes
  4. Creates simple accept_task function
  5. Enables UUID extension for code generation

  ## Security:
  - Maintains RLS on tasks table
  - Users can only accept tasks they didn't create
  - Prevents double acceptance of tasks
*/

-- Enable UUID extension for generating unique codes
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop all old task status related items
DROP FUNCTION IF EXISTS accept_task(uuid, uuid);
DROP FUNCTION IF EXISTS accept_task(text, text);
DROP FUNCTION IF EXISTS accept_task(uuid);
DROP TYPE IF EXISTS task_current_status CASCADE;
DROP TYPE IF EXISTS task_phase CASCADE;
DROP TYPE IF EXISTS task_moderation_status CASCADE;

-- Remove old status-related columns from tasks table
DO $$
BEGIN
  -- Remove task_current_status column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'task_current_status'
  ) THEN
    ALTER TABLE tasks DROP COLUMN task_current_status;
  END IF;

  -- Remove phase column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'phase'
  ) THEN
    ALTER TABLE tasks DROP COLUMN phase;
  END IF;

  -- Remove moderation_status column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'moderation_status'
  ) THEN
    ALTER TABLE tasks DROP COLUMN moderation_status;
  END IF;

  -- Remove moderation_reason column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'moderation_reason'
  ) THEN
    ALTER TABLE tasks DROP COLUMN moderation_reason;
  END IF;

  -- Remove moderated_at column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'moderated_at'
  ) THEN
    ALTER TABLE tasks DROP COLUMN moderated_at;
  END IF;

  -- Remove moderated_by column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'moderated_by'
  ) THEN
    ALTER TABLE tasks DROP COLUMN moderated_by;
  END IF;

  -- Remove assignee_id column if it exists (we use accepted_by instead)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'assignee_id'
  ) THEN
    ALTER TABLE tasks DROP COLUMN assignee_id;
  END IF;
END $$;

-- Add user_accept_code column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'user_accept_code'
  ) THEN
    ALTER TABLE tasks ADD COLUMN user_accept_code uuid;
  END IF;
END $$;

-- Add accepted_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN accepted_at timestamptz;
  END IF;
END $$;

-- Create index on user_accept_code for efficient lookups
CREATE INDEX IF NOT EXISTS idx_tasks_user_accept_code 
ON tasks(user_accept_code) 
WHERE user_accept_code IS NOT NULL;

-- Create the accept_task function
CREATE OR REPLACE FUNCTION accept_task(
  p_task_id uuid,
  p_user_id uuid
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  category task_category,
  store text,
  dropoff_address text,
  dropoff_instructions text,
  urgency task_urgency,
  reward_cents integer,
  estimated_minutes integer,
  status task_status,
  created_by uuid,
  accepted_by uuid,
  accepted_at timestamptz,
  user_accept_code uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_record tasks%ROWTYPE;
  v_unique_code uuid;
BEGIN
  -- Generate unique code
  v_unique_code := uuid_generate_v4();
  
  -- Lock and update the task atomically
  UPDATE tasks 
  SET 
    status = 'accepted'::task_status,
    accepted_by = p_user_id,
    accepted_at = now(),
    user_accept_code = v_unique_code,
    updated_at = now()
  WHERE 
    tasks.id = p_task_id
    AND tasks.status = 'open'::task_status
    AND tasks.created_by != p_user_id
    AND tasks.accepted_by IS NULL
  RETURNING * INTO v_task_record;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    -- Determine specific error
    SELECT * INTO v_task_record FROM tasks WHERE tasks.id = p_task_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'TASK_NOT_FOUND';
    ELSIF v_task_record.created_by = p_user_id THEN
      RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
    ELSIF v_task_record.status != 'open'::task_status OR v_task_record.accepted_by IS NOT NULL THEN
      RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
    ELSE
      RAISE EXCEPTION 'TASK_ACCEPTANCE_FAILED';
    END IF;
  END IF;
  
  -- Return the updated task
  RETURN QUERY
  SELECT 
    v_task_record.id,
    v_task_record.title,
    v_task_record.description,
    v_task_record.category,
    v_task_record.store,
    v_task_record.dropoff_address,
    v_task_record.dropoff_instructions,
    v_task_record.urgency,
    v_task_record.reward_cents,
    v_task_record.estimated_minutes,
    v_task_record.status,
    v_task_record.created_by,
    v_task_record.accepted_by,
    v_task_record.accepted_at,
    v_task_record.user_accept_code,
    v_task_record.created_at,
    v_task_record.updated_at;
END;
$$;