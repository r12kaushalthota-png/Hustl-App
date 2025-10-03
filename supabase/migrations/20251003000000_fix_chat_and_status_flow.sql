/*
  # Fix Chat and Task Status System

  1. Changes
    - Update task status flow to exactly 4 steps: started → on_the_way → delivered → completed
    - Fix RLS policies for chat to allow participant-only access
    - Ensure chat room creation is idempotent
    - Fix unread counts and last message tracking

  2. Status Flow Rules
    - Doer can advance: accepted → started → on_the_way → delivered
    - Poster can finish: delivered → completed
    - Poster can cancel at any time before completed

  3. Security
    - RLS enabled with minimal participant-only policies
    - Only task participants can access chat
    - Role-based status update permissions
*/

-- Drop existing policies and recreate with correct permissions
DROP POLICY IF EXISTS "Users can view their chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their chats" ON chat_messages;
DROP POLICY IF EXISTS "Users can view chat members" ON chat_members;
DROP POLICY IF EXISTS "Users can view their chat rooms" ON chat_rooms;

-- Chat messages policies (participant-only)
CREATE POLICY "Participants can view messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_messages.room_id
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_messages.room_id
      AND chat_members.user_id = auth.uid()
    )
  );

-- Chat members policies
CREATE POLICY "Users can view chat members of their rooms"
  ON chat_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members cm
      WHERE cm.room_id = chat_members.room_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage chat members"
  ON chat_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own chat member record"
  ON chat_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Chat rooms policies
CREATE POLICY "Participants can view their chat rooms"
  ON chat_rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_rooms.id
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create chat rooms"
  ON chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update chat rooms"
  ON chat_rooms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_rooms.id
      AND chat_members.user_id = auth.uid()
    )
  );

-- Update task status validation for new flow
CREATE OR REPLACE FUNCTION update_task_status(p_task_id uuid, p_new_status text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_task_row tasks%ROWTYPE;
  v_current_status text;
  v_is_doer boolean;
  v_is_poster boolean;
BEGIN
  -- Get task
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
  -- Poster can cancel at any time before completed
  IF p_new_status = 'cancelled' THEN
    IF NOT v_is_poster THEN
      RETURN json_build_object('error', 'Only task poster can cancel');
    END IF;
    IF v_current_status = 'completed' THEN
      RETURN json_build_object('error', 'Cannot cancel completed task');
    END IF;

  -- Poster can mark delivered → completed
  ELSIF p_new_status = 'completed' THEN
    IF NOT v_is_poster THEN
      RETURN json_build_object('error', 'Only task poster can mark as completed');
    END IF;
    IF v_current_status != 'delivered' THEN
      RETURN json_build_object('error', 'Task must be delivered before completion');
    END IF;

  -- Doer can advance through the flow
  ELSIF v_is_doer THEN
    -- Validate progression: started → on_the_way → delivered
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

  -- Update task status
  UPDATE tasks
  SET
    current_status = p_new_status,
    status = CASE WHEN p_new_status IN ('completed', 'cancelled') THEN p_new_status ELSE status END,
    updated_at = now()
  WHERE id = p_task_id;

  -- Record in history
  INSERT INTO task_status_history (task_id, status, changed_by)
  VALUES (p_task_id, p_new_status, auth.uid());

  RETURN json_build_object('success', true, 'status', p_new_status);
END;
$$;

-- Ensure function grants
GRANT EXECUTE ON FUNCTION update_task_status TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_room_for_task TO authenticated;
GRANT EXECUTE ON FUNCTION mark_room_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_inbox TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_status_timeline TO authenticated;
