/*
  # Fix accept_task function enum case sensitivity

  1. Drop existing function
    - Remove the old accept_task function that has incorrect enum values
  
  2. Recreate function with correct enum values
    - Use lowercase enum values: 'accepted' instead of 'Accepted'
    - Maintain all existing validation and security logic
    - Return proper task data with updated status
  
  3. Security
    - Preserve all existing RLS and validation checks
    - Maintain atomic operation to prevent race conditions
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS accept_task(uuid, uuid);

-- Recreate the function with correct enum values
CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid, p_user_id uuid)
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
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_AUTHENTICATED';
  END IF;

  -- Check if the provided user_id matches the authenticated user
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED_USER';
  END IF;

  -- Check if task exists and is open
  IF NOT EXISTS (
    SELECT 1 FROM tasks 
    WHERE tasks.id = p_task_id 
    AND tasks.status = 'open'
    AND tasks.moderation_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;

  -- Check if user is trying to accept their own task
  IF EXISTS (
    SELECT 1 FROM tasks 
    WHERE tasks.id = p_task_id 
    AND tasks.created_by = p_user_id
  ) THEN
    RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
  END IF;

  -- Atomically update the task (this prevents race conditions)
  UPDATE tasks 
  SET 
    status = 'accepted',
    task_current_status = 'accepted',
    accepted_by = p_user_id,
    assignee_id = p_user_id,
    accepted_at = now(),
    last_status_update = now(),
    updated_at = now()
  WHERE tasks.id = p_task_id 
    AND tasks.status = 'open'
    AND tasks.moderation_status = 'approved';

  -- Check if the update was successful
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
END;
$$;