/*
  # Refresh update_task_status Function
  
  1. Purpose
    - Recreate the update_task_status function to refresh schema cache
    - Ensure simplified task status flow is properly implemented
    - Fix "function not found in schema cache" error
  
  2. Status Flow
    - Task doers: accepted → started → on_the_way → delivered
    - Task posters: can mark as completed when delivered
    - Task posters: can cancel at any time (except when completed)
  
  3. Security
    - SECURITY DEFINER for proper authorization
    - Validates user permissions (doer vs poster)
    - Enforces valid status transitions
*/

-- Drop and recreate update_task_status with simplified status flow
DROP FUNCTION IF EXISTS update_task_status(uuid, text);

CREATE OR REPLACE FUNCTION update_task_status(p_task_id uuid, p_new_status text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET lock_timeout = '3s'
AS $$
DECLARE
  v_task_row tasks%ROWTYPE;
  v_current_status text;
  v_is_doer boolean;
  v_is_poster boolean;
BEGIN
  SELECT * INTO v_task_row FROM tasks WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Task not found');
  END IF;

  v_current_status := COALESCE(v_task_row.current_status, v_task_row.status);
  v_is_doer := v_task_row.accepted_by = auth.uid();
  v_is_poster := v_task_row.created_by = auth.uid();

  IF NOT (v_is_doer OR v_is_poster) THEN
    RETURN json_build_object('error', 'Not authorized to update this task');
  END IF;

  -- Validate status transitions
  IF p_new_status = 'cancelled' THEN
    IF NOT v_is_poster THEN
      RETURN json_build_object('error', 'Only task poster can cancel');
    END IF;
    IF v_current_status = 'completed' THEN
      RETURN json_build_object('error', 'Cannot cancel completed task');
    END IF;

  ELSIF p_new_status = 'completed' THEN
    IF NOT v_is_poster THEN
      RETURN json_build_object('error', 'Only task poster can mark as completed');
    END IF;
    IF v_current_status != 'delivered' THEN
      RETURN json_build_object('error', 'Task must be delivered before completion');
    END IF;

  ELSIF v_is_doer THEN
    -- Validate doer status transitions
    IF p_new_status = 'started' AND v_current_status NOT IN ('accepted') THEN
      RETURN json_build_object('error', 'Can only start an accepted task');
    ELSIF p_new_status = 'on_the_way' AND v_current_status != 'started' THEN
      RETURN json_build_object('error', 'Must start task before going on the way');
    ELSIF p_new_status = 'delivered' AND v_current_status != 'on_the_way' THEN
      RETURN json_build_object('error', 'Must be on the way before delivering');
    END IF;
  ELSE
    RETURN json_build_object('error', 'Invalid status update');
  END IF;

  BEGIN
    UPDATE tasks
    SET
      current_status = p_new_status,
      status = CASE WHEN p_new_status IN ('completed', 'cancelled') THEN p_new_status ELSE status END,
      updated_at = now()
    WHERE id = p_task_id;
  EXCEPTION
    WHEN lock_not_available THEN
      RETURN json_build_object('error', 'Task is being updated. Please try again.');
  END;

  INSERT INTO task_status_history (task_id, status, changed_by)
  VALUES (p_task_id, p_new_status, auth.uid());

  RETURN json_build_object('success', true, 'status', p_new_status);
END;
$$;

-- Ensure task_status_history constraint includes all valid statuses
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'task_status_history' AND constraint_name LIKE '%status_check%'
  ) THEN
    ALTER TABLE task_status_history DROP CONSTRAINT IF EXISTS task_status_history_status_check;
  END IF;
END $$;

ALTER TABLE task_status_history
  ADD CONSTRAINT task_status_history_status_check
  CHECK (status IN ('accepted', 'started', 'on_the_way', 'delivered', 'completed', 'cancelled', 'en_route', 'arrived', 'picked_up'));

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_task_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task_status(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION update_task_status(uuid, text) TO service_role;
