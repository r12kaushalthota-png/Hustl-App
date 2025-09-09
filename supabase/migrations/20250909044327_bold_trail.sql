/*
  # Fix Task Acceptance System

  1. Functions
    - Drop and recreate accept_task function with correct syntax
    - Drop and recreate ensure_room_for_task function
    - Drop and recreate get_chat_inbox function
    - Drop and recreate mark_room_read function

  2. Fixes
    - Fixed PL/pgSQL loop syntax (1..10 instead of 10 DOWNTO 2)
    - Fixed column references (created_by instead of owner_id)
    - Fixed parameter naming consistency
    - Proper table aliases throughout
*/

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS accept_task(uuid);
DROP FUNCTION IF EXISTS accept_task(p_task_id uuid);
DROP FUNCTION IF EXISTS ensure_room_for_task(uuid);
DROP FUNCTION IF EXISTS ensure_room_for_task(p_task_id uuid);
DROP FUNCTION IF EXISTS get_chat_inbox();
DROP FUNCTION IF EXISTS mark_room_read(uuid);
DROP FUNCTION IF EXISTS mark_room_read(p_room_id uuid);

-- Create accept_task function with correct syntax
CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid)
RETURNS TABLE(
  task_id uuid,
  status text,
  acceptance_code text,
  chat_id uuid,
  task_category text,
  accepted_by uuid,
  owner_id uuid,
  accepted_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_record RECORD;
  v_acceptance_code text;
  v_chat_room_id uuid;
  v_current_user_id uuid;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Generate 5-digit acceptance code
  FOR i IN 1..10 LOOP
    v_acceptance_code := LPAD(floor(random() * 100000)::text, 5, '0');
    
    -- Check if code is unique
    IF NOT EXISTS (
      SELECT 1 FROM tasks 
      WHERE user_accept_code::text = v_acceptance_code 
      AND created_at > NOW() - INTERVAL '24 hours'
    ) THEN
      EXIT;
    END IF;
  END LOOP;

  -- Atomically accept the task
  UPDATE tasks t
  SET 
    status = 'accepted',
    accepted_by = v_current_user_id,
    accepted_at = NOW(),
    user_accept_code = v_acceptance_code::uuid,
    updated_at = NOW()
  WHERE t.id = p_task_id
    AND t.status = 'open'
    AND t.created_by != v_current_user_id
  RETURNING 
    t.id,
    t.status,
    t.category,
    t.created_by,
    t.accepted_by,
    t.accepted_at
  INTO v_task_record;

  -- Check if task was successfully accepted
  IF v_task_record.id IS NULL THEN
    -- Check specific failure reasons
    IF EXISTS (SELECT 1 FROM tasks t WHERE t.id = p_task_id AND t.created_by = v_current_user_id) THEN
      RAISE EXCEPTION 'Cannot accept your own task';
    ELSIF EXISTS (SELECT 1 FROM tasks t WHERE t.id = p_task_id AND t.status != 'open') THEN
      RAISE EXCEPTION 'Task has already been accepted or is no longer available';
    ELSIF NOT EXISTS (SELECT 1 FROM tasks t WHERE t.id = p_task_id) THEN
      RAISE EXCEPTION 'Task not found';
    ELSE
      RAISE EXCEPTION 'Task not available for acceptance';
    END IF;
  END IF;

  -- Create chat room
  INSERT INTO chat_rooms (task_id, created_at)
  VALUES (p_task_id, NOW())
  RETURNING id INTO v_chat_room_id;

  -- Add both users to chat
  INSERT INTO chat_members (room_id, user_id, unread_count, last_read_at)
  VALUES 
    (v_chat_room_id, v_task_record.created_by, 0, NOW()),
    (v_chat_room_id, v_current_user_id, 0, NOW());

  -- Send system message with acceptance code
  INSERT INTO chat_messages (room_id, sender_id, text, created_at)
  VALUES (
    v_chat_room_id, 
    v_current_user_id, 
    'Task accepted! Acceptance code: ' || v_acceptance_code,
    NOW()
  );

  -- Return success data
  RETURN QUERY SELECT
    v_task_record.id,
    v_task_record.status::text,
    v_acceptance_code,
    v_chat_room_id,
    v_task_record.category::text,
    v_task_record.accepted_by,
    v_task_record.created_by,
    v_task_record.accepted_at;
END;
$$;

-- Create ensure_room_for_task function
CREATE OR REPLACE FUNCTION ensure_room_for_task(p_task_id uuid)
RETURNS TABLE(
  id uuid,
  task_id uuid,
  created_at timestamptz,
  last_message text,
  last_message_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_id uuid;
  v_current_user_id uuid;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if room already exists
  SELECT cr.id INTO v_room_id
  FROM chat_rooms cr
  WHERE cr.task_id = p_task_id;

  -- If room doesn't exist, create it
  IF v_room_id IS NULL THEN
    INSERT INTO chat_rooms (task_id, created_at)
    VALUES (p_task_id, NOW())
    RETURNING chat_rooms.id INTO v_room_id;

    -- Add task participants to chat
    INSERT INTO chat_members (room_id, user_id, unread_count, last_read_at)
    SELECT v_room_id, t.created_by, 0, NOW()
    FROM tasks t
    WHERE t.id = p_task_id
    UNION
    SELECT v_room_id, t.accepted_by, 0, NOW()
    FROM tasks t
    WHERE t.id = p_task_id AND t.accepted_by IS NOT NULL;
  END IF;

  -- Return room data
  RETURN QUERY
  SELECT cr.id, cr.task_id, cr.created_at, cr.last_message, cr.last_message_at
  FROM chat_rooms cr
  WHERE cr.id = v_room_id;
END;
$$;

-- Create get_chat_inbox function
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
DECLARE
  v_current_user_id uuid;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    cr.id as room_id,
    cr.task_id,
    other_member.user_id as other_id,
    COALESCE(p.full_name, p.username, 'User') as other_name,
    p.avatar_url as other_avatar_url,
    p.major as other_major,
    cr.last_message,
    cr.last_message_at,
    COALESCE(my_member.unread_count, 0) as unread_count
  FROM chat_rooms cr
  JOIN chat_members my_member ON my_member.room_id = cr.id AND my_member.user_id = v_current_user_id
  JOIN chat_members other_member ON other_member.room_id = cr.id AND other_member.user_id != v_current_user_id
  LEFT JOIN profiles p ON p.id = other_member.user_id
  ORDER BY cr.last_message_at DESC NULLS LAST;
END;
$$;

-- Create mark_room_read function
CREATE OR REPLACE FUNCTION mark_room_read(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id uuid;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Update unread count and last read time
  UPDATE chat_members
  SET 
    unread_count = 0,
    last_read_at = NOW()
  WHERE room_id = p_room_id 
    AND user_id = v_current_user_id;
END;
$$;