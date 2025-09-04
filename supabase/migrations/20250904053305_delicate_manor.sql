/*
  # Fix accept_task function to properly accept tasks

  1. Function Updates
    - Fix accept_task RPC function to properly validate and accept tasks
    - Remove restrictive checks that prevent task acceptance
    - Ensure all open tasks can be accepted by any user (except task creator)
    - Return updated task data after successful acceptance

  2. Security
    - Maintain RLS policies for task access
    - Prevent users from accepting their own tasks
    - Ensure atomic updates to prevent race conditions
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS accept_task(uuid);

-- Create the accept_task function
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
  task_record RECORD;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;

  -- Get the task with row-level locking to prevent race conditions
  SELECT * INTO task_record
  FROM tasks t
  WHERE t.id = task_id
  FOR UPDATE;

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

  -- Update the task to accepted status
  UPDATE tasks
  SET 
    status = 'accepted',
    accepted_by = current_user_id,
    task_current_status = 'accepted',
    last_status_update = NOW(),
    updated_at = NOW(),
    accepted_at = NOW()
  WHERE tasks.id = task_id;

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