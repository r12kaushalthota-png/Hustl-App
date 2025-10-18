/*
  # Refresh update_task_status Function (Updated for New Phases)

  1. Purpose
    - Update transition rules to include new phases
    - Maintain proper authorization (poster vs doer)
    - Normalize status casing
    - Keep status + current_status columns synced

  2. Status Flow
    - Task posters: open → accepted → (cancelled | completed)
    - Task doers: accepted → started → on_the_way → delivered
    - Poster can mark completed after delivered
    - Poster can cancel anytime before completion

  3. Security
    - SECURITY DEFINER for proper authorization
    - Lowercases all inputs
    - Ensures valid state transitions only
*/

-- Drop and recreate update_task_status with updated phase flow
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
  v_status_lower text;
BEGIN
  -- Normalize casing
  v_status_lower := lower(p_new_status);

  -- Fetch task
  SELECT * INTO v_task_row FROM tasks WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Task not found');
  END IF;

  v_current_status := COALESCE(v_task_row.current_status, v_task_row.status::text);
  v_is_doer := v_task_row.accepted_by = auth.uid();
  v_is_poster := v_task_row.created_by = auth.uid();

  IF NOT (v_is_doer OR v_is_poster) THEN
    RETURN json_build_object('error', 'Not authorized to update this task');
  END IF;

  -- Validate transitions
  IF v_status_lower = 'cancelled' THEN
    IF NOT v_is_poster THEN
      RETURN json_build_object('error', 'Only task poster can cancel');
    END IF;
    IF v_current_status = 'completed' THEN
      RETURN json_build_object('error', 'Cannot cancel completed task');
    END IF;

  ELSIF v_status_lower = 'completed' THEN
    IF NOT v_is_poster THEN
      RETURN json_build_object('error', 'Only task poster can mark as completed');
    END IF;
    IF v_current_status NOT IN ('delivered', 'accepted', 'started', 'on_the_way') THEN
      RETURN json_build_object('error', format('Cannot complete task from status: %s', v_current_status));
    END IF;

  ELSIF v_is_doer THEN
    -- Doer transitions
    IF v_status_lower = 'started' AND v_current_status NOT IN ('accepted') THEN
      RETURN json_build_object('error', format('Invalid transition: %s -> started', v_current_status));
    ELSIF v_status_lower = 'on_the_way' AND v_current_status NOT IN ('started') THEN
      RETURN json_build_object('error', format('Invalid transition: %s -> on_the_way', v_current_status));
    ELSIF v_status_lower = 'delivered' AND v_current_status NOT IN ('on_the_way') THEN
      RETURN json_build_object('error', format('Invalid transition: %s -> delivered', v_current_status));
    END IF;

  ELSIF v_is_poster THEN
    -- Poster transitions (early accept or reopen flow)
    IF v_status_lower = 'accepted' AND v_current_status NOT IN ('open', 'posted') THEN
      RETURN json_build_object('error', format('Cannot accept from status: %s', v_current_status));
    END IF;
  ELSE
    RETURN json_build_object('error', 'Invalid status update');
  END IF;

  -- Update safely
  BEGIN
    UPDATE tasks
    SET
      current_status = v_status_lower,
      status = CASE
                 WHEN v_status_lower IN ('completed', 'cancelled') THEN v_status_lower::task_status
                 WHEN v_status_lower = 'accepted' AND status = 'open' THEN 'accepted'::task_status
                 ELSE status
               END,
      updated_at = now()
    WHERE id = p_task_id;
  EXCEPTION
    WHEN lock_not_available THEN
      RETURN json_build_object('error', 'Task is being updated. Please try again.');
  END;

  -- Insert into history
  INSERT INTO task_status_history (task_id, status, changed_by)
  VALUES (p_task_id, v_status_lower, auth.uid());

  RETURN json_build_object('success', true, 'status', v_status_lower);
END;
$$;

-- Refresh status history constraint to include new phases
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
  CHECK (status IN (
    'open',
    'posted',
    'accepted',
    'started',
    'on_the_way',
    'delivered',
    'completed',
    'cancelled'
  ));

-- Permissions
GRANT EXECUTE ON FUNCTION update_task_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task_status(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION update_task_status(uuid, text) TO service_role;
