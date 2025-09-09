/*
  # Fix Task Acceptance System

  This migration fixes all issues with task acceptance:
  1. Drops conflicting functions to avoid return type errors
  2. Uses correct column names from existing schema (created_by, not owner_id)
  3. Fixes duplicate parameter names
  4. Creates complete atomic task acceptance with chat creation
  5. Generates unique 5-digit acceptance codes
*/

-- Drop existing conflicting functions
DROP FUNCTION IF EXISTS accept_task(uuid);
DROP FUNCTION IF EXISTS ensure_room_for_task(uuid);
DROP FUNCTION IF EXISTS get_chat_inbox();
DROP FUNCTION IF EXISTS mark_room_read(uuid);

-- Create the accept_task function with proper parameters
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
  v_task_record tasks%ROWTYPE;
  v_current_user_id uuid;
  v_acceptance_code text;
  v_chat_room_id uuid;
  v_digits int[] := ARRAY[0,1,2,3,4,5,6,7,8,9];
  v_temp int;
  v_i int;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Generate unique 5-digit code using Fisher-Yates shuffle
  FOR v_i IN 1..5 LOOP
    v_temp := v_digits[v_i];
    v_digits[v_i] := v_digits[floor(random() * (10 - v_i + 1))::int + v_i];
    v_digits[floor(random() * (10 - v_i + 1))::int + v_i] := v_temp;
  END LOOP;
  
  v_acceptance_code := array_to_string(v_digits[1:5], '');

  -- Atomic task acceptance with row-level locking
  UPDATE tasks 
  SET 
    status = 'accepted',
    accepted_by = v_current_user_id,
    accepted_at = now(),
    user_accept_code = v_acceptance_code::uuid,
    updated_at = now()
  WHERE 
    id = p_task_id 
    AND status = 'open' 
    AND created_by != v_current_user_id
  RETURNING * INTO v_task_record;

  -- Check if update was successful
  IF NOT FOUND THEN
    -- Check specific failure reasons
    SELECT * INTO v_task_record FROM tasks WHERE id = p_task_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Task not found';
    ELSIF v_task_record.created_by = v_current_user_id THEN
      RAISE EXCEPTION 'Cannot accept your own task';
    ELSIF v_task_record.status != 'open' THEN
      RAISE EXCEPTION 'Task has already been accepted or is not available';
    ELSE
      RAISE EXCEPTION 'Task not available for acceptance';
    END IF;
  END IF;

  -- Create or get chat room for this task
  INSERT INTO chat_rooms (task_id, created_at)
  VALUES (p_task_id, now())
  ON CONFLICT (task_id) DO NOTHING
  RETURNING id INTO v_chat_room_id;
  
  -- If room already existed, get its ID
  IF v_chat_room_id IS NULL THEN
    SELECT id INTO v_chat_room_id FROM chat_rooms WHERE task_id = p_task_id;
  END IF;

  -- Add both users as chat members
  INSERT INTO chat_members (room_id, user_id, unread_count, last_read_at)
  VALUES 
    (v_chat_room_id, v_task_record.created_by, 0, now()),
    (v_chat_room_id, v_current_user_id, 0, now())
  ON CONFLICT (room_id, user_id) DO NOTHING;

  -- Post system message with acceptance code
  INSERT INTO chat_messages (room_id, sender_id, text, created_at)
  VALUES (
    v_chat_room_id,
    v_current_user_id,
    'Task accepted! Acceptance code: ' || v_acceptance_code,
    now()
  );

  -- Return success data
  RETURN QUERY SELECT
    v_task_record.id,
    v_task_record.status::text,
    v_acceptance_code,
    v_chat_room_id,
    v_task_record.category::text,
    v_current_user_id,
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
BEGIN
  -- Try to get existing room
  SELECT cr.id INTO v_room_id 
  FROM chat_rooms cr 
  WHERE cr.task_id = p_task_id;
  
  -- Create room if it doesn't exist
  IF v_room_id IS NULL THEN
    INSERT INTO chat_rooms (task_id, created_at)
    VALUES (p_task_id, now())
    RETURNING chat_rooms.id INTO v_room_id;
  END IF;
  
  -- Return room data
  RETURN QUERY 
  SELECT cr.id, cr.task_id, cr.created_at, cr.last_message, cr.last_message_at
  FROM chat_rooms cr 
  WHERE cr.id = v_room_id;
END;
$$;

-- Create mark_room_read function
CREATE OR REPLACE FUNCTION mark_room_read(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Update chat member's unread count and last read time
  UPDATE chat_members 
  SET 
    unread_count = 0,
    last_read_at = now()
  WHERE 
    room_id = p_room_id 
    AND user_id = v_user_id;
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
  unread_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
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
  JOIN chat_members my_member ON my_member.room_id = cr.id AND my_member.user_id = v_user_id
  JOIN chat_members other_member ON other_member.room_id = cr.id AND other_member.user_id != v_user_id
  LEFT JOIN profiles other_profile ON other_profile.id = other_member.user_id
  ORDER BY cr.last_message_at DESC NULLS LAST;
END;
$$;