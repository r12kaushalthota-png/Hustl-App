/*
  # Create accept_task RPC function

  1. New Functions
    - `accept_task(task_id uuid)` - Atomically accepts a task using auth.uid()
  
  2. Security
    - Uses auth.uid() to get current user automatically
    - Prevents users from accepting their own tasks
    - Atomic operation prevents race conditions
  
  3. Error Handling
    - TASK_NOT_FOUND: Task doesn't exist or not open
    - CANNOT_ACCEPT_OWN_TASK: User trying to accept their own task
    - TASK_ALREADY_ACCEPTED: Task was already accepted by someone else
*/

-- Create the accept_task function that uses auth.uid() internally
CREATE OR REPLACE FUNCTION public.accept_task(task_id uuid)
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
  category task_category,
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
  current_user_id uuid;
  task_record record;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING MESSAGE = 'User must be authenticated';
  END IF;

  -- First, check if the task exists and get its details
  SELECT * INTO task_record FROM tasks WHERE tasks.id = task_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND' USING MESSAGE = 'Task not found or not available';
  END IF;

  -- Check if user is trying to accept their own task
  IF task_record.created_by = current_user_id THEN
    RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK' USING MESSAGE = 'You cannot accept your own task';
  END IF;

  -- Check if task is still open
  IF task_record.status != 'open'::task_status THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED' USING MESSAGE = 'Task was already accepted by another user';
  END IF;

  -- Atomically update the task
  UPDATE tasks 
  SET 
    status = 'accepted'::task_status,
    accepted_by = current_user_id,
    accepted_at = now(),
    assignee_id = current_user_id,
    task_current_status = 'accepted'::task_current_status,
    last_status_update = now(),
    updated_at = now()
  WHERE tasks.id = task_id 
    AND tasks.status = 'open'::task_status
    AND tasks.created_by != current_user_id;

  -- Check if the update actually happened (race condition check)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED' USING MESSAGE = 'Task was already accepted by another user';
  END IF;

  -- Return the updated task
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    t.price_cents,
    t.estimated_minutes,
    t.location_text,
    t.status,
    t.created_by,
    t.accepted_by,
    t.created_at,
    t.updated_at,
    t.category,
    t.store,
    t.dropoff_address,
    t.dropoff_instructions,
    t.urgency,
    t.reward_cents,
    t.current_status,
    t.last_status_update,
    t.task_current_status,
    t.accepted_at,
    t.assignee_id,
    t.phase,
    t.moderation_status,
    t.moderation_reason,
    t.moderated_at,
    t.moderated_by
  FROM tasks t 
  WHERE t.id = task_id;
END;
$$;