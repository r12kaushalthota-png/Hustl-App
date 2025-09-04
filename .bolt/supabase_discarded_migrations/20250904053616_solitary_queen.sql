/*
  # Fix accept_task function enum case

  1. Function Updates
    - Fix accept_task function to use lowercase 'accepted' for task_current_status enum
    - Ensure proper enum value matching for task acceptance

  2. Changes
    - Update task_current_status to use 'accepted' instead of 'Accepted'
    - Maintain all existing functionality and validation
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
  
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Lock and get the task
  SELECT * INTO task_record
  FROM tasks
  WHERE id = task_id_param
  FOR UPDATE;

  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Check if task is open
  IF task_record.status != 'open' THEN
    RAISE EXCEPTION 'Task is not available for acceptance';
  END IF;

  -- Check if user is not the creator
  IF task_record.created_by = user_id_val THEN
    RAISE EXCEPTION 'Cannot accept your own task';
  END IF;

  -- Update the task to accepted status
  UPDATE tasks
  SET 
    status = 'accepted',
    accepted_by = user_id_val,
    accepted_at = now(),
    assignee_id = user_id_val,
    task_current_status = 'accepted',
    last_status_update = now(),
    updated_at = now()
  WHERE id = task_id_param;

  -- Get the updated task
  SELECT * INTO task_record
  FROM tasks
  WHERE id = task_id_param;

  -- Return the updated task as JSON
  RETURN row_to_json(task_record);
END;
$$;