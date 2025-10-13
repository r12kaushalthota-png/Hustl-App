/*
  # Create Accept Task Function with Simplified Code Generation
  
  1. New Function
    - `accept_task(task_id)` - Accepts a task and generates a simple 5-digit numeric code
  
  2. Changes
    - Generates user_accept_code as a 5-digit number (10000-99999)
    - Updates task status to 'accepted'
    - Sets accepted_by and accepted_at fields
    - Returns the updated task
  
  3. Security
    - Only authenticated users can accept tasks
    - Users cannot accept their own tasks
    - Task must be in 'open' status
*/

-- Function: Accept a task and generate a simple 5-digit code
CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_task_row tasks%ROWTYPE;
  v_accept_code text;
  v_result json;
BEGIN
  -- Get the task
  SELECT * INTO v_task_row FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Task not found');
  END IF;

  -- Check if task is open
  IF v_task_row.status != 'open' THEN
    RETURN json_build_object('error', 'Task is no longer available');
  END IF;

  -- Check if user is trying to accept their own task
  IF v_task_row.created_by = auth.uid() THEN
    RETURN json_build_object('error', 'You cannot accept your own task');
  END IF;

  -- Generate a simple 5-digit code (10000-99999)
  v_accept_code := (floor(random() * 90000) + 10000)::text;

  -- Update the task
  UPDATE tasks 
  SET 
    status = 'accepted',
    current_status = 'accepted',
    accepted_by = auth.uid(),
    accepted_at = now(),
    user_accept_code = v_accept_code,
    updated_at = now()
  WHERE id = p_task_id;

  -- Insert status history
  INSERT INTO task_status_history (task_id, status, changed_by)
  VALUES (p_task_id, 'accepted', auth.uid());

  -- Return the updated task
  SELECT json_build_object(
    'id', id,
    'title', title,
    'status', status,
    'current_status', current_status,
    'user_accept_code', user_accept_code,
    'accepted_by', accepted_by,
    'accepted_at', accepted_at,
    'created_by', created_by
  ) INTO v_result FROM tasks WHERE id = p_task_id;

  RETURN json_build_array(v_result);
END;
$$;
