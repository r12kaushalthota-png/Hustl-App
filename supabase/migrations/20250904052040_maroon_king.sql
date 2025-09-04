/*
  # Convert task_category enum to TEXT

  1. Column Changes
    - Convert `tasks.category` from task_category enum to TEXT
    - Remove enum casting and constraints
    - Keep existing check constraint for valid values

  2. Function Updates
    - Update accept_task function to return TEXT category
    - Remove all task_category enum references

  3. Cleanup
    - Drop task_category enum type
    - Ensure all queries use plain text
*/

-- First, convert the column from enum to text
ALTER TABLE tasks 
ALTER COLUMN category TYPE text USING category::text;

-- Update the accept_task function to return text category
CREATE OR REPLACE FUNCTION accept_task(task_id uuid)
RETURNS TABLE(
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
  task_current_status task_current_status,
  last_status_update timestamptz,
  created_by uuid,
  accepted_by uuid,
  accepted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  moderation_status task_moderation_status,
  moderation_reason text,
  moderated_at timestamptz,
  moderated_by uuid,
  assignee_id uuid,
  phase task_phase,
  price_cents integer,
  location_text text,
  current_status task_current_status
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  task_record record;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING MESSAGE = 'You must be logged in to accept tasks';
  END IF;

  -- Fetch and lock the task for update
  SELECT * INTO task_record
  FROM tasks 
  WHERE tasks.id = task_id
  FOR UPDATE;

  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND' USING MESSAGE = 'Task not found or no longer available';
  END IF;

  -- Check if user is trying to accept their own task
  IF task_record.created_by = current_user_id THEN
    RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK' USING MESSAGE = 'You cannot accept your own task';
  END IF;

  -- Check if task is still open
  IF task_record.status != 'open'::task_status THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED' USING MESSAGE = 'This task has already been accepted by another user';
  END IF;

  -- Update task atomically
  UPDATE tasks 
  SET 
    status = 'accepted'::task_status,
    accepted_by = current_user_id,
    accepted_at = now(),
    updated_at = now()
  WHERE tasks.id = task_id
    AND tasks.status = 'open'::task_status
    AND tasks.created_by != current_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED' USING MESSAGE = 'This task has already been accepted by another user';
  END IF;

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
    t.task_current_status,
    t.last_status_update,
    t.created_by,
    t.accepted_by,
    t.accepted_at,
    t.created_at,
    t.updated_at,
    t.moderation_status,
    t.moderation_reason,
    t.moderated_at,
    t.moderated_by,
    t.assignee_id,
    t.phase,
    t.price_cents,
    t.location_text,
    t.current_status
  FROM tasks t
  WHERE t.id = task_id;
END;
$$;

-- Drop the task_category enum if it exists
DROP TYPE IF EXISTS task_category CASCADE;

-- Ensure the category column has a proper check constraint for valid values
DO $$
BEGIN
  -- Remove old constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'tasks' AND constraint_name = 'tasks_category_check'
  ) THEN
    ALTER TABLE tasks DROP CONSTRAINT tasks_category_check;
  END IF;

  -- Add new text-based constraint
  ALTER TABLE tasks ADD CONSTRAINT tasks_category_check 
    CHECK (category IN ('food', 'grocery', 'coffee'));
END $$;