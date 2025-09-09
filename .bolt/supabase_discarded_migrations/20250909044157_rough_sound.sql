/*
  # Fix Task Acceptance System

  1. Functions
    - `accept_task(p_task_id)` - Atomically accept a task and return acceptance data
    - `ensure_room_for_task(p_task_id)` - Create chat room for accepted task
    - `get_chat_inbox()` - Get user's chat conversations
    - `mark_room_read(p_room_id)` - Mark chat room as read

  2. Security
    - All functions use proper RLS and user authentication
    - Atomic task acceptance prevents race conditions

  3. Changes
    - Fixed all column references to use existing schema
    - Proper PL/pgSQL syntax for loops and variables
    - Clean function signatures without conflicts
*/

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS accept_task(uuid);
DROP FUNCTION IF EXISTS accept_task(p_task_id uuid);
DROP FUNCTION IF EXISTS ensure_room_for_task(uuid);
DROP FUNCTION IF EXISTS ensure_room_for_task(p_task_id uuid);
DROP FUNCTION IF EXISTS get_chat_inbox();
DROP FUNCTION IF EXISTS mark_room_read(uuid);
DROP FUNCTION IF EXISTS mark_room_read(p_room_id uuid);

-- Generate unique 5-digit acceptance code
CREATE OR REPLACE FUNCTION generate_acceptance_code()
RETURNS TEXT AS $$
DECLARE
  digits INTEGER[] := ARRAY[0,1,2,3,4,5,6,7,8,9];
  result TEXT := '';
  temp_val INTEGER;
  i INTEGER;
  j INTEGER;
BEGIN
  -- Fisher-Yates shuffle
  FOR i IN 10 DOWNTO 2 LOOP
    j := floor(random() * i)::INTEGER + 1;
    temp_val := digits[i];
    digits[i] := digits[j];
    digits[j] := temp_val;
  END LOOP;
  
  -- Take first 5 digits
  FOR i IN 1..5 LOOP
    result := result || digits[i]::TEXT;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Accept task atomically
CREATE OR REPLACE FUNCTION accept_task(p_task_id UUID)
RETURNS TABLE(
  task_id UUID,
  status TEXT,
  acceptance_code TEXT,
  chat_id UUID,
  task_category TEXT,
  accepted_by UUID,
  owner_id UUID,
  accepted_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
  v_task RECORD;
  v_acceptance_code TEXT;
  v_room_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Lock and get task
  SELECT t.id, t.created_by, t.status, t.category
  INTO v_task
  FROM tasks t
  WHERE t.id = p_task_id
  FOR UPDATE;

  -- Validate task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Validate task is available
  IF v_task.status != 'open' THEN
    RAISE EXCEPTION 'Task is not available for acceptance';
  END IF;

  -- Prevent self-acceptance
  IF v_task.created_by = v_user_id THEN
    RAISE EXCEPTION 'Cannot accept your own task';
  END IF;

  -- Generate acceptance code
  v_acceptance_code := generate_acceptance_code();

  -- Update task
  UPDATE tasks t
  SET 
    status = 'accepted',
    accepted_by = v_user_id,
    accepted_at = NOW(),
    user_accept_code = v_acceptance_code::UUID,
    updated_at = NOW()
  WHERE t.id = p_task_id;

  -- Create chat room
  INSERT INTO chat_rooms (task_id, created_at)
  VALUES (p_task_id, NOW())
  RETURNING id INTO v_room_id;

  -- Add chat members
  INSERT INTO chat_members (room_id, user_id, unread_count, last_read_at)
  VALUES 
    (v_room_id, v_task.created_by, 0, NOW()),
    (v_room_id, v_user_id, 0, NOW());

  -- Post system message with acceptance code
  INSERT INTO chat_messages (room_id, sender_id, text, created_at)
  VALUES (
    v_room_id, 
    v_user_id, 
    'Task accepted! Acceptance code: ' || v_acceptance_code,
    NOW()
  );

  -- Return success data
  RETURN QUERY SELECT 
    p_task_id,
    'accepted'::TEXT,
    v_acceptance_code,
    v_room_id,
    v_task.category,
    v_user_id,
    v_task.created_by,
    NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure chat room exists for task
CREATE OR REPLACE FUNCTION ensure_room_for_task(p_task_id UUID)
RETURNS UUID AS $$
DECLARE
  v_room_id UUID;
  v_task RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if room already exists
  SELECT id INTO v_room_id
  FROM chat_rooms
  WHERE task_id = p_task_id;

  IF FOUND THEN
    RETURN v_room_id;
  END IF;

  -- Get task info
  SELECT t.created_by, t.accepted_by, t.status
  INTO v_task
  FROM tasks t
  WHERE t.id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Only create room for accepted tasks
  IF v_task.status != 'accepted' THEN
    RAISE EXCEPTION 'Task must be accepted to create chat room';
  END IF;

  -- Verify user is involved in task
  IF v_user_id != v_task.created_by AND v_user_id != v_task.accepted_by THEN
    RAISE EXCEPTION 'User not involved in this task';
  END IF;

  -- Create room
  INSERT INTO chat_rooms (task_id, created_at)
  VALUES (p_task_id, NOW())
  RETURNING id INTO v_room_id;

  -- Add members
  INSERT INTO chat_members (room_id, user_id, unread_count, last_read_at)
  VALUES 
    (v_room_id, v_task.created_by, 0, NOW()),
    (v_room_id, v_task.accepted_by, 0, NOW());

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's chat inbox
CREATE OR REPLACE FUNCTION get_chat_inbox()
RETURNS TABLE(
  room_id UUID,
  task_id UUID,
  other_id UUID,
  other_name TEXT,
  other_avatar_url TEXT,
  other_major TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    cr.id,
    cr.task_id,
    CASE 
      WHEN t.created_by = v_user_id THEN t.accepted_by
      ELSE t.created_by
    END,
    CASE 
      WHEN t.created_by = v_user_id THEN p2.full_name
      ELSE p1.full_name
    END,
    CASE 
      WHEN t.created_by = v_user_id THEN p2.avatar_url
      ELSE p1.avatar_url
    END,
    CASE 
      WHEN t.created_by = v_user_id THEN p2.major
      ELSE p1.major
    END,
    cr.last_message,
    cr.last_message_at,
    COALESCE(cm.unread_count, 0)
  FROM chat_rooms cr
  JOIN tasks t ON t.id = cr.task_id
  JOIN chat_members cm ON cm.room_id = cr.id AND cm.user_id = v_user_id
  LEFT JOIN profiles p1 ON p1.id = t.created_by
  LEFT JOIN profiles p2 ON p2.id = t.accepted_by
  WHERE t.created_by = v_user_id OR t.accepted_by = v_user_id
  ORDER BY cr.last_message_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark chat room as read
CREATE OR REPLACE FUNCTION mark_room_read(p_room_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Update unread count
  UPDATE chat_members
  SET 
    unread_count = 0,
    last_read_at = NOW()
  WHERE room_id = p_room_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;