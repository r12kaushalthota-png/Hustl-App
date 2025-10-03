/*
  # Fix Database Locking Issues

  1. Changes
    - Add lock timeout settings to prevent indefinite waits
    - Optimize accept_task function to reduce lock duration
    - Add advisory locks for better concurrency control
    - Improve ensure_room_for_task idempotency
    - Add proper error handling for lock timeouts

  2. Performance Improvements
    - Reduce transaction scope in critical functions
    - Use NOWAIT for non-blocking row locks
    - Add ON CONFLICT handling for race conditions
    - Optimize chat room creation flow

  3. Security
    - Maintain all existing RLS policies
    - Keep SECURITY DEFINER where needed
    - Preserve authorization checks
*/

-- Drop and recreate accept_task with optimized locking
DROP FUNCTION IF EXISTS accept_task(uuid);

CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid)
RETURNS TABLE (
  task_id uuid,
  task_status text,
  acceptance_code text,
  chat_id uuid,
  task_category text,
  accepted_by uuid,
  owner_id uuid,
  accepted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET lock_timeout = '3s'
AS $$
DECLARE
  v_task_record RECORD;
  v_current_user_id uuid;
  v_acceptance_uuid uuid;
  v_display_code text;
  v_chat_room_id uuid;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Try to acquire advisory lock to prevent duplicate accepts
  IF NOT pg_try_advisory_xact_lock(hashtext(p_task_id::text)) THEN
    RAISE EXCEPTION 'Task is being processed by another user. Please try again.';
  END IF;

  -- Get and lock the task with NOWAIT to fail fast
  BEGIN
    SELECT * INTO STRICT v_task_record
    FROM tasks
    WHERE id = p_task_id
    FOR UPDATE NOWAIT;
  EXCEPTION
    WHEN lock_not_available THEN
      RAISE EXCEPTION 'Task is currently locked. Please try again in a moment.';
    WHEN no_data_found THEN
      RAISE EXCEPTION 'Task not found';
  END;

  -- Check if task is available
  IF v_task_record.status != 'open' THEN
    RAISE EXCEPTION 'Task is not available for acceptance';
  END IF;

  -- Check if user is trying to accept their own task
  IF v_task_record.created_by = v_current_user_id THEN
    RAISE EXCEPTION 'Cannot accept your own task';
  END IF;

  -- Generate UUID for database storage
  v_acceptance_uuid := gen_random_uuid();

  -- Generate 5-digit display code from UUID
  v_display_code := LPAD((ABS(('x' || SUBSTR(v_acceptance_uuid::text, 1, 8))::bit(32)::int) % 100000)::text, 5, '0');

  -- Update task to accepted status
  UPDATE tasks
  SET
    status = 'accepted',
    accepted_by = v_current_user_id,
    accepted_at = NOW(),
    user_accept_code = v_acceptance_uuid,
    updated_at = NOW()
  WHERE id = p_task_id;

  -- Create or get chat room for this task (idempotent)
  INSERT INTO chat_rooms (task_id, created_at)
  VALUES (p_task_id, NOW())
  ON CONFLICT (task_id) DO UPDATE SET task_id = EXCLUDED.task_id
  RETURNING id INTO v_chat_room_id;

  -- Add both users to the chat room (idempotent)
  INSERT INTO chat_members (room_id, user_id, unread_count, joined_at)
  VALUES
    (v_chat_room_id, v_current_user_id, 0, NOW()),
    (v_chat_room_id, v_task_record.created_by, 0, NOW())
  ON CONFLICT (room_id, user_id) DO NOTHING;

  -- Return the result
  RETURN QUERY SELECT
    p_task_id,
    'accepted'::text,
    v_display_code,
    v_chat_room_id,
    v_task_record.category::text,
    v_current_user_id,
    v_task_record.created_by,
    NOW();
END;
$$;

-- Optimize ensure_room_for_task with better locking
DROP FUNCTION IF EXISTS ensure_room_for_task(uuid);

CREATE OR REPLACE FUNCTION ensure_room_for_task(p_task_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET lock_timeout = '3s'
AS $$
DECLARE
  v_room_id uuid;
  v_task_row tasks%ROWTYPE;
  v_result json;
BEGIN
  -- Get task without locking (read-only check)
  SELECT * INTO v_task_row FROM tasks WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Task not found');
  END IF;

  IF v_task_row.accepted_by IS NULL THEN
    RETURN json_build_object('error', 'Task must be accepted first');
  END IF;

  IF v_task_row.created_by != auth.uid() AND v_task_row.accepted_by != auth.uid() THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;

  -- Try to get existing room first (no lock needed)
  SELECT id INTO v_room_id FROM chat_rooms WHERE task_id = p_task_id;

  IF v_room_id IS NULL THEN
    -- Use advisory lock to prevent duplicate creation
    IF pg_try_advisory_xact_lock(hashtext('chat_room_' || p_task_id::text)) THEN
      -- Double-check room doesn't exist
      SELECT id INTO v_room_id FROM chat_rooms WHERE task_id = p_task_id;

      IF v_room_id IS NULL THEN
        -- Create room and members atomically
        INSERT INTO chat_rooms (task_id)
        VALUES (p_task_id)
        ON CONFLICT (task_id) DO UPDATE SET task_id = EXCLUDED.task_id
        RETURNING id INTO v_room_id;

        -- Add members idempotently
        INSERT INTO chat_members (room_id, user_id, unread_count, joined_at)
        VALUES
          (v_room_id, v_task_row.created_by, 0, NOW()),
          (v_room_id, v_task_row.accepted_by, 0, NOW())
        ON CONFLICT (room_id, user_id) DO NOTHING;
      END IF;
    ELSE
      -- Another transaction is creating the room, wait and retry
      PERFORM pg_sleep(0.1);
      SELECT id INTO v_room_id FROM chat_rooms WHERE task_id = p_task_id;

      IF v_room_id IS NULL THEN
        RETURN json_build_object('error', 'Unable to create chat room. Please try again.');
      END IF;
    END IF;
  END IF;

  -- Build and return result
  SELECT json_build_object(
    'id', id,
    'task_id', task_id,
    'created_at', created_at,
    'last_message', last_message,
    'last_message_at', last_message_at
  ) INTO v_result FROM chat_rooms WHERE id = v_room_id;

  RETURN v_result;
END;
$$;

-- Optimize update_task_status with timeout settings
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
  -- Get task without FOR UPDATE initially
  SELECT * INTO v_task_row FROM tasks WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Task not found');
  END IF;

  v_current_status := COALESCE(v_task_row.current_status, v_task_row.status);
  v_is_doer := v_task_row.accepted_by = auth.uid();
  v_is_poster := v_task_row.created_by = auth.uid();

  -- Check if user is authorized
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
    IF p_new_status = 'started' AND v_current_status NOT IN ('accepted', 'open') THEN
      RETURN json_build_object('error', 'Invalid status transition');
    ELSIF p_new_status = 'on_the_way' AND v_current_status != 'started' THEN
      RETURN json_build_object('error', 'Must start task before going on the way');
    ELSIF p_new_status = 'delivered' AND v_current_status != 'on_the_way' THEN
      RETURN json_build_object('error', 'Must be on the way before delivering');
    END IF;
  ELSE
    RETURN json_build_object('error', 'Invalid status update');
  END IF;

  -- Update task status with minimal lock time
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

  -- Record in history
  INSERT INTO task_status_history (task_id, status, changed_by)
  VALUES (p_task_id, p_new_status, auth.uid());

  RETURN json_build_object('success', true, 'status', p_new_status);
END;
$$;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION accept_task TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_room_for_task TO authenticated;
GRANT EXECUTE ON FUNCTION update_task_status TO authenticated;
GRANT EXECUTE ON FUNCTION mark_room_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_inbox TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_status_timeline TO authenticated;
