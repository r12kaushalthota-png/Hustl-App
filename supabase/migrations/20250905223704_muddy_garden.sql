/*
  # Fix accept_task function enum case sensitivity

  1. Function Updates
    - Update accept_task function to use lowercase enum values
    - Ensure task_current_status uses 'accepted' instead of 'Accepted'
    - Fix any other enum value case mismatches

  2. Security
    - Maintain existing RLS policies
    - Preserve function permissions
*/

-- Drop and recreate the accept_task function with correct enum values
CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record tasks%ROWTYPE;
  result json;
BEGIN
  -- Check if task exists and is open
  SELECT * INTO task_record
  FROM tasks
  WHERE id = p_task_id AND status = 'open' AND moderation_status = 'approved';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Task not found or not available'
    );
  END IF;
  
  -- Check if user is trying to accept their own task
  IF task_record.created_by = p_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot accept your own task'
    );
  END IF;
  
  -- Update task with correct lowercase enum values
  UPDATE tasks
  SET 
    status = 'accepted',
    accepted_by = p_user_id,
    assignee_id = p_user_id,
    accepted_at = now(),
    task_current_status = 'accepted',  -- Use lowercase
    last_status_update = now(),
    updated_at = now()
  WHERE id = p_task_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'task_id', p_task_id,
    'accepted_by', p_user_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;