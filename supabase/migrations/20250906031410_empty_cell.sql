/*
  # Fix accept_task function with correct enum values and syntax

  1. Function Updates
    - Drop existing accept_task function to avoid conflicts
    - Recreate with correct lowercase enum values
    - Fix column reference ambiguity with table aliases
    - Ensure proper return type and structure

  2. Security
    - Maintain all existing RLS policies
    - Preserve authentication and authorization checks
    - Keep atomic operations to prevent race conditions

  3. Error Handling
    - Add proper exception handling
    - Include specific error messages for debugging
*/

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS accept_task(uuid, uuid);
DROP FUNCTION IF EXISTS accept_task(p_task_id uuid, p_user_id uuid);

-- Create the accept_task function with correct enum values
CREATE OR REPLACE FUNCTION accept_task(
  p_task_id uuid,
  p_user_id uuid
)
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
  created_at timestamptz,
  updated_at timestamptz,
  price_cents integer,
  location_text text,
  accepted_at timestamptz,
  assignee_id uuid,
  phase task_phase,
  moderation_status task_moderation_status,
  moderation_reason text,
  moderated_at timestamptz,
  moderated_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record RECORD;
BEGIN
  -- Check if user is authenticated
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_AUTHENTICATED';
  END IF;

  -- Get and lock the task for update
  SELECT * INTO task_record
  FROM tasks t
  WHERE t.id = p_task_id
  FOR UPDATE;

  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;

  -- Check if user is trying to accept their own task
  IF task_record.created_by = p_user_id THEN
    RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
  END IF;

  -- Check if task is still open
  IF task_record.status != 'open' THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
  END IF;

  -- Update task with accepted status
  UPDATE tasks
  SET 
    status = 'accepted'::task_status,
    task_current_status = 'accepted'::task_current_status,
    accepted_by = p_user_id,
    accepted_at = NOW(),
    last_status_update = NOW(),
    updated_at = NOW(),
    assignee_id = p_user_id
  WHERE tasks.id = p_task_id
    AND tasks.status = 'open'::task_status;

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
    t.updated_at,
    t.price_cents,
    t.location_text,
    t.accepted_at,
    t.assignee_id,
    t.phase,
    t.moderation_status,
    t.moderation_reason,
    t.moderated_at,
    t.moderated_by
  FROM tasks t
  WHERE t.id = p_task_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'ACCEPT_TASK_ERROR: %', SQLERRM;
END;
$$;