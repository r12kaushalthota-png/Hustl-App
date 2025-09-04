/*
  # Fix task_category enum error

  1. Database Changes
    - Convert tasks.category from enum to TEXT
    - Update accept_task function to work with TEXT
    - Remove task_category enum type
    - Update constraints to use TEXT values

  2. Security
    - Maintain existing RLS policies
    - Keep accept_task function secure with auth.uid()

  3. Notes
    - Fixes "type task_category does not exist" error
    - Ensures accept_task RPC works properly
    - Maintains data integrity with check constraints
*/

-- Convert category column from enum to TEXT
ALTER TABLE tasks 
ALTER COLUMN category TYPE TEXT USING category::text;

-- Drop the enum type if it exists
DROP TYPE IF EXISTS task_category;

-- Update check constraint to use text values
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_category_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_category_check 
CHECK (category = ANY (ARRAY['food'::text, 'grocery'::text, 'coffee'::text]));

-- Create or replace the accept_task function
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
  status text,
  task_current_status text,
  last_status_update timestamptz,
  created_by uuid,
  accepted_by uuid,
  created_at timestamptz,
  updated_at timestamptz
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
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;

  -- Get task details first
  SELECT * INTO task_record
  FROM tasks t
  WHERE t.id = task_id;

  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;

  -- Check if user is trying to accept their own task
  IF task_record.created_by = current_user_id THEN
    RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
  END IF;

  -- Check if task is still open
  IF task_record.status != 'open' THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
  END IF;

  -- Atomically update the task
  UPDATE tasks 
  SET 
    status = 'accepted',
    accepted_by = current_user_id,
    accepted_at = now(),
    assignee_id = current_user_id,
    task_current_status = 'accepted',
    last_status_update = now(),
    updated_at = now()
  WHERE tasks.id = task_id 
    AND tasks.status = 'open'
    AND tasks.created_by != current_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
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
    t.created_at,
    t.updated_at
  FROM tasks t
  WHERE t.id = task_id;
END;
$$;