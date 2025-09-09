/*
  # Fix accept_task RPC function

  1. Updates
    - Fix the accept_task function to reference the correct 'status' column instead of 'current_status'
    - Ensure the function works with the actual tasks table schema
  
  2. Security
    - Maintains existing security checks
    - Preserves function permissions
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS accept_task(uuid, uuid);

-- Create the corrected accept_task function
CREATE OR REPLACE FUNCTION accept_task(
  task_id_param uuid,
  user_accept_code_param uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record tasks%ROWTYPE;
  result json;
BEGIN
  -- Get the task with row-level locking
  SELECT * INTO task_record
  FROM tasks
  WHERE id = task_id_param
  FOR UPDATE;

  -- Check if task exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Task not found'
    );
  END IF;

  -- Check if task is still open
  IF task_record.status != 'open' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Task is no longer available'
    );
  END IF;

  -- Check if user accept code matches (if provided)
  IF user_accept_code_param IS NOT NULL AND task_record.user_accept_code != user_accept_code_param THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid accept code'
    );
  END IF;

  -- Check if user is trying to accept their own task
  IF task_record.created_by = auth.uid() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot accept your own task'
    );
  END IF;

  -- Update the task
  UPDATE tasks
  SET 
    status = 'accepted',
    accepted_by = auth.uid(),
    accepted_at = now(),
    updated_at = now()
  WHERE id = task_id_param;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Task accepted successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'An error occurred while accepting the task'
    );
END;
$$;