/*
  # Create accept_task function with correct enum values

  1. Function Definition
    - `accept_task(p_task_id uuid, p_user_id uuid)` - accepts a task atomically
    - Returns the updated task record
    - Uses lowercase enum values ('accepted' not 'Accepted')

  2. Security & Validation
    - Validates user authentication
    - Prevents users from accepting their own tasks
    - Ensures task is available for acceptance
    - Atomic operation to prevent race conditions

  3. Business Logic
    - Updates task status to 'accepted'
    - Sets task_current_status to 'accepted'
    - Records accepted_by and accepted_at timestamps
    - Returns complete updated task data
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS accept_task(uuid, uuid);
DROP FUNCTION IF EXISTS accept_task(uuid);

-- Create the accept_task function with correct enum values
CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid, p_user_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  price_cents integer,
  estimated_minutes integer,
  location_text text,
  status task_status,
  created_by uuid,
  accepted_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  category text,
  store text,
  dropoff_address text,
  dropoff_instructions text,
  urgency text,
  reward_cents integer,
  current_status task_current_status,
  last_status_update timestamptz,
  task_current_status task_current_status,
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
  updated_task RECORD;
BEGIN
  -- Validate user authentication
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_AUTHENTICATED';
  END IF;

  -- Get the task with row-level lock to prevent race conditions
  SELECT * INTO task_record
  FROM tasks
  WHERE tasks.id = p_task_id
  FOR UPDATE;

  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;

  -- Validate task can be accepted
  IF task_record.created_by = p_user_id THEN
    RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
  END IF;

  IF task_record.status != 'open' THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
  END IF;

  -- Update task atomically with correct lowercase enum values
  UPDATE tasks
  SET 
    status = 'accepted'::task_status,
    task_current_status = 'accepted'::task_current_status,
    current_status = 'accepted'::task_current_status,
    accepted_by = p_user_id,
    assignee_id = p_user_id,
    accepted_at = NOW(),
    last_status_update = NOW(),
    updated_at = NOW()
  WHERE tasks.id = p_task_id
    AND tasks.status = 'open'
    AND tasks.created_by != p_user_id
  RETURNING * INTO updated_task;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
  END IF;

  -- Return the updated task
  RETURN QUERY
  SELECT 
    updated_task.id,
    updated_task.title,
    updated_task.description,
    updated_task.price_cents,
    updated_task.estimated_minutes,
    updated_task.location_text,
    updated_task.status,
    updated_task.created_by,
    updated_task.accepted_by,
    updated_task.created_at,
    updated_task.updated_at,
    updated_task.category,
    updated_task.store,
    updated_task.dropoff_address,
    updated_task.dropoff_instructions,
    updated_task.urgency,
    updated_task.reward_cents,
    updated_task.current_status,
    updated_task.last_status_update,
    updated_task.task_current_status,
    updated_task.accepted_at,
    updated_task.assignee_id,
    updated_task.phase,
    updated_task.moderation_status,
    updated_task.moderation_reason,
    updated_task.moderated_at,
    updated_task.moderated_by;
END;
$$;