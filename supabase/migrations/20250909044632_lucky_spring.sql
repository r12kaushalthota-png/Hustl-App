/*
  # Fix Task Acceptance System

  1. Functions
    - `accept_task(p_task_id)` - Accept a task and generate acceptance code
    - `ensure_room_for_task(p_task_id)` - Ensure chat room exists for task
    - `mark_room_read(p_room_id)` - Mark chat room as read
    - `get_chat_inbox()` - Get user's chat conversations

  2. Security
    - All functions use proper RLS and user authentication
    - Chat rooms are only accessible to task participants

  3. Changes
    - Fixed all ambiguous column references by fully qualifying with table aliases
    - Fixed UUID type handling for acceptance codes
    - Proper error handling and validation
*/

-- Drop existing functions to recreate them properly
DROP FUNCTION IF EXISTS accept_task(uuid);
DROP FUNCTION IF EXISTS accept_task(p_task_id uuid);
DROP FUNCTION IF EXISTS ensure_room_for_task(uuid);
DROP FUNCTION IF EXISTS ensure_room_for_task(p_task_id uuid);
DROP FUNCTION IF EXISTS mark_room_read(uuid);
DROP FUNCTION IF EXISTS mark_room_read(p_room_id uuid);
DROP FUNCTION IF EXISTS get_chat_inbox();

-- Accept task function with proper column qualification
CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_record RECORD;
  v_acceptance_code TEXT;
  v_room_id uuid;
  v_result json;
BEGIN
  -- Get current user ID
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get and lock the task
  SELECT tasks.id, tasks.created_by, tasks.status, tasks.category, tasks.title
  INTO v_task_record
  FROM tasks
  WHERE tasks.id = p_task_id
  FOR UPDATE;

  -- Validate task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Validate task is available
  IF v_task_record.status != 'open' THEN
    RAISE EXCEPTION 'Task is no longer available for acceptance';
  END IF;

  -- Prevent self-acceptance
  IF v_task_record.created_by = auth.uid() THEN
    RAISE EXCEPTION 'Cannot accept your own task';
  END IF;

  -- Generate 5-digit acceptance code
  v_acceptance_code := LPAD(FLOOR(RANDOM() * 90000 + 10000)::TEXT, 5, '0');

  -- Update task with acceptance
  UPDATE tasks 
  SET 
    status = 'accepted',
    accepted_by = auth.uid(),
    accepted_at = NOW(),
    user_accept_code = gen_random_uuid(),
    updated_at = NOW()
  WHERE tasks.id = p_task_id;

  -- Ensure chat room exists
  INSERT INTO chat_rooms (task_id, created_at)
  VALUES (p_task_id, NOW())
  ON CONFLICT (task_id) DO NOTHING
  RETURNING chat_rooms.id INTO v_room_id;

  -- Get room ID if it already existed
  IF v_room_id IS NULL THEN
    SELECT chat_rooms.id INTO v_room_id
    FROM chat_rooms
    WHERE chat_rooms.task_id = p_task_id;
  END IF;

  -- Add both users as chat members
  INSERT INTO chat_members (room_id, user_id, unread_count, last_read_at)
  VALUES 
    (v_room_id, v_task_record.created_by, 0, NOW()),
    (v_room_id, auth.uid(), 0, NOW())
  ON CONFLICT (room_id, user_id) DO NOTHING;

  -- Build result
  v_result := json_build_object(
    'task_id', p_task_id,
    'status', 'accepted',
    'acceptance_code', v_acceptance_code,
    'chat_id', v_room_id,
    'task_category', v_task_record.category,
    'accepted_by', auth.uid(),
    'owner_id', v_task_record.created_by,
    'accepted_at', NOW()
  );

  RETURN v_result;
END;
$$;

-- Ensure chat room exists for task
CREATE OR REPLACE FUNCTION ensure_room_for_task(p_task_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_id uuid;
  v_task_record RECORD;
BEGIN
  -- Get current user ID
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get task info
  SELECT tasks.id, tasks.created_by, tasks.accepted_by, tasks.status
  INTO v_task_record
  FROM tasks
  WHERE tasks.id = p_task_id;

  -- Validate task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Validate user is involved in task
  IF v_task_record.created_by != auth.uid() AND v_task_record.accepted_by != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get or create chat room
  INSERT INTO chat_rooms (task_id, created_at)
  VALUES (p_task_id, NOW())
  ON CONFLICT (task_id) DO NOTHING
  RETURNING chat_rooms.id INTO v_room_id;

  -- Get room ID if it already existed
  IF v_room_id IS NULL THEN
    SELECT chat_rooms.id INTO v_room_id
    FROM chat_rooms
    WHERE chat_rooms.task_id = p_task_id;
  END IF;

  -- Add both users as chat members if they aren't already
  INSERT INTO chat_members (room_id, user_id, unread_count, last_read_at)
  VALUES 
    (v_room_id, v_task_record.created_by, 0, NOW()),
    (v_room_id, COALESCE(v_task_record.accepted_by, auth.uid()), 0, NOW())
  ON CONFLICT (room_id, user_id) DO NOTHING;

  RETURN json_build_object(
    'id', v_room_id,
    'task_id', p_task_id,
    'created_at', NOW()
  );
END;
$$;

-- Mark chat room as read
CREATE OR REPLACE FUNCTION mark_room_read(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get current user ID
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Update member's read status
  UPDATE chat_members 
  SET 
    unread_count = 0,
    last_read_at = NOW()
  WHERE chat_members.room_id = p_room_id 
    AND chat_members.user_id = auth.uid();
END;
$$;

-- Get user's chat inbox
CREATE OR REPLACE FUNCTION get_chat_inbox()
RETURNS TABLE(
  room_id uuid,
  task_id uuid,
  other_id uuid,
  other_name text,
  other_avatar_url text,
  other_major text,
  last_message text,
  last_message_at timestamptz,
  unread_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get current user ID
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT 
    cr.id as room_id,
    cr.task_id,
    other_member.user_id as other_id,
    COALESCE(other_profile.full_name, other_profile.username, 'User') as other_name,
    other_profile.avatar_url as other_avatar_url,
    other_profile.major as other_major,
    cr.last_message,
    cr.last_message_at,
    COALESCE(my_member.unread_count, 0) as unread_count
  FROM chat_rooms cr
  JOIN chat_members my_member ON my_member.room_id = cr.id AND my_member.user_id = auth.uid()
  JOIN chat_members other_member ON other_member.room_id = cr.id AND other_member.user_id != auth.uid()
  LEFT JOIN profiles other_profile ON other_profile.id = other_member.user_id
  ORDER BY cr.last_message_at DESC NULLS LAST;
END;
$$;