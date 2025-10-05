/*
  # Fix Task Status Flow Validation

  1. Changes
    - Update update_task_status function to use correct status flow
    - Status flow: accepted → en_route → arrived → picked_up → delivered → completed
    - Task doers can advance through en_route, arrived, picked_up, delivered
    - Task posters can only complete or cancel tasks

  2. Security
    - Maintain existing RLS policies
    - Keep authorization checks
*/

-- Drop and recreate update_task_status with correct status flow
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
    IF p_new_status = 'en_route' AND v_current_status NOT IN ('accepted') THEN
      RETURN json_build_object('error', 'Invalid status transition');
    ELSIF p_new_status = 'arrived' AND v_current_status != 'en_route' THEN
      RETURN json_build_object('error', 'Must be en route before arriving');
    ELSIF p_new_status = 'picked_up' AND v_current_status != 'arrived' THEN
      RETURN json_build_object('error', 'Must arrive before picking up');
    ELSIF p_new_status = 'delivered' AND v_current_status != 'picked_up' THEN
      RETURN json_build_object('error', 'Must pick up before delivering');
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

GRANT EXECUTE ON FUNCTION update_task_status TO authenticated;
