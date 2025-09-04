/*
  # Fix task_status enum and implement atomic task acceptance

  1. Database Schema Updates
    - Remove 'posted' from task_status enum, keep only: open, accepted, in_progress, completed, cancelled
    - Migrate any existing 'posted' status values to 'open'
    - Add required columns: accepted_by, accepted_at
    - Add performance indexes for task queries

  2. Atomic RPC Function
    - Create accept_task(task_id, user_id) function with race condition protection
    - Only allows accepting tasks with status = 'open' and not created by the user
    - Atomically updates status to 'accepted', sets accepted_by and accepted_at
    - Returns updated task row on success
    - Raises specific exceptions: TASK_ALREADY_ACCEPTED, CANNOT_ACCEPT_OWN_TASK, TASK_NOT_FOUND

  3. Security (RLS)
    - Users can read open tasks (available tasks)
    - Task creators and assignees can read their own tasks
    - Only task assignees can update their accepted tasks
*/

-- Step 1: Add required columns if they don't exist
DO $$
BEGIN
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

-- Step 2: Update any 'posted' status values to 'open' before enum change
UPDATE tasks 
SET status = 'open'::task_status 
WHERE status::text = 'posted';

-- Step 3: Create new enum without 'posted'
DO $$
BEGIN
  -- Check if we need to recreate the enum
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'task_status' AND e.enumlabel = 'posted'
  ) THEN
    -- Create new enum without 'posted'
    CREATE TYPE task_status_new AS ENUM ('open', 'accepted', 'in_progress', 'completed', 'cancelled');
    
    -- Update the column to use the new enum
    ALTER TABLE tasks ALTER COLUMN status TYPE task_status_new USING status::text::task_status_new;
    
    -- Drop old enum and rename new one
    DROP TYPE task_status;
    ALTER TYPE task_status_new RENAME TO task_status;
  END IF;
END $$;

-- Step 4: Ensure default status is 'open'
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'open'::task_status;

-- Step 5: Create atomic accept_task function
CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid, p_user_id uuid)
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
  task_current_status task_current_status,
  last_status_update timestamptz,
  created_by uuid,
  accepted_by uuid,
  accepted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record RECORD;
BEGIN
  -- Attempt atomic update with all conditions
  UPDATE tasks 
  SET 
    status = 'accepted'::task_status,
    accepted_by = p_user_id,
    accepted_at = now(),
    updated_at = now()
  WHERE 
    tasks.id = p_task_id 
    AND tasks.status = 'open'::task_status
    AND tasks.created_by != p_user_id
  RETURNING * INTO task_record;

  -- Check what happened and raise appropriate errors
  IF NOT FOUND THEN
    -- Check if task exists at all
    SELECT * INTO task_record FROM tasks WHERE tasks.id = p_task_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'TASK_NOT_FOUND';
    END IF;
    
    -- Check if user is trying to accept their own task
    IF task_record.created_by = p_user_id THEN
      RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
    END IF;
    
    -- Check if task is already accepted
    IF task_record.status != 'open'::task_status THEN
      RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
    END IF;
    
    -- Fallback error
    RAISE EXCEPTION 'UNABLE_TO_ACCEPT_TASK';
  END IF;

  -- Return the updated task
  RETURN QUERY
  SELECT 
    task_record.id,
    task_record.title,
    task_record.description,
    task_record.category,
    task_record.store,
    task_record.dropoff_address,
    task_record.dropoff_instructions,
    task_record.urgency,
    task_record.reward_cents,
    task_record.estimated_minutes,
    task_record.status,
    task_record.task_current_status,
    task_record.last_status_update,
    task_record.created_by,
    task_record.accepted_by,
    task_record.accepted_at,
    task_record.created_at,
    task_record.updated_at;
END;
$$;

-- Step 6: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status_open ON tasks (status) WHERE status = 'open'::task_status;
CREATE INDEX IF NOT EXISTS idx_tasks_accepted_by_status ON tasks (accepted_by, status) WHERE accepted_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_by_status ON tasks (created_by, status);

-- Step 7: Update RLS policies for new enum values
DROP POLICY IF EXISTS "Users can read open tasks" ON tasks;
DROP POLICY IF EXISTS "Users can read their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their accepted tasks" ON tasks;

-- Allow reading open tasks (available tasks)
CREATE POLICY "Users can read open tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (status = 'open'::task_status);

-- Allow reading own tasks (created or accepted)
CREATE POLICY "Users can read their own tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR accepted_by = auth.uid());

-- Allow updating accepted tasks by assignee
CREATE POLICY "Users can update their accepted tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (accepted_by = auth.uid() AND status = 'accepted'::task_status)
  WITH CHECK (accepted_by = auth.uid());

-- Allow task creators to insert their own tasks
CREATE POLICY "Users can insert their own tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Allow task creators to update their own tasks
CREATE POLICY "Users can update their own tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());