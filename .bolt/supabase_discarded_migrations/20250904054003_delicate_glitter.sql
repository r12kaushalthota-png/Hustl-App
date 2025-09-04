/*
  # Fix accept_task function enum case

  1. Function Updates
    - Fix accept_task function to use lowercase 'accepted' instead of 'Accepted'
    - Ensure all enum values are properly lowercase
  
  2. Security
    - Maintain existing RLS policies
    - Preserve authentication checks
*/

CREATE OR REPLACE FUNCTION accept_task(task_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record tasks%ROWTYPE;
  user_id_val uuid;
BEGIN
  -- Get the authenticated user ID
  user_id_val := auth.uid();
  
  -- Check if user is authenticated
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Lock and get the task
  SELECT * INTO task_record
  FROM tasks
  WHERE id = task_id_param
  FOR UPDATE;

  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'task_not_found';
  END IF;

  -- Check if task is still open
  IF task_record.status != 'open' THEN
    RAISE EXCEPTION 'task_not_available';
  END IF;

  -- Check if user is not the task creator
  IF task_record.created_by = user_id_val THEN
    RAISE EXCEPTION 'cannot_accept_own_task';
  END IF;

  -- Update the task to accepted status
  UPDATE tasks
  SET 
    status = 'accepted',
    accepted_by = user_id_val,
    accepted_at = now(),
    task_current_status = 'accepted',
    last_status_update = now(),
    assignee_id = user_id_val,
    updated_at = now()
  WHERE id = task_id_param;

  -- Get the updated task record
  SELECT * INTO task_record
  FROM tasks
  WHERE id = task_id_param;

  -- Return the updated task as JSON
  RETURN row_to_json(task_record);
END;
$$;