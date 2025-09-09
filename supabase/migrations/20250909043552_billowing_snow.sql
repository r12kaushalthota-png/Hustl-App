/*
  # Fix Task Acceptance System

  This migration completely fixes the task acceptance system by:
  1. Dropping and recreating all conflicting functions with correct signatures
  2. Using the actual database schema (created_by, not owner_id)
  3. Implementing atomic task acceptance with 5-digit codes
  4. Creating automatic chat rooms and system messages
  5. Ensuring proper return data for the frontend

  ## Changes Made
  - Drop all existing conflicting functions
  - Create accept_task function with correct return type
  - Create ensure_room_for_task function with correct signature
  - Add system message posting to chat
  - Use actual column names from schema (created_by)
*/

-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS accept_task(uuid);
DROP FUNCTION IF EXISTS ensure_room_for_task(uuid);
DROP FUNCTION IF EXISTS get_task_owner(uuid);

-- Create the accept_task function with atomic locking and proper return type
CREATE OR REPLACE FUNCTION accept_task(task_id uuid)
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
  v_user_id uuid;
  v_acceptance_code text;
  v_chat_room_id uuid;
  v_digits int[];
  v_i int;
  v_j int;
  v_temp int;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Generate unique 5-digit code using Fisher-Yates shuffle
  v_digits := ARRAY[0,1,2,3,4,5,6,7,8,9];
  
  -- Fisher-Yates shuffle
  FOR v_i IN REVERSE 10..2 LOOP
    v_j := floor(random() * v_i)::int + 1;
    v_temp := v_digits[v_i];
    v_digits[v_i] := v_digits[v_j];
    v_digits[v_j] := v_temp;
  END LOOP;
  
  -- Take first 5 digits
  v_acceptance_code := v_digits[1]::text || v_digits[2]::text || v_digits[3]::text || v_digits[4]::text || v_digits[5]::text;

  -- Atomic update with proper locking
  UPDATE tasks 
  SET 
    status = 'accepted',
    accepted_by = v_user_id,
    accepted_at = now(),
    user_accept_code = v_acceptance_code::uuid,
    updated_at = now()
  WHERE 
    id = task_id 
    AND status = 'open' 
    AND created_by != v_user_id
  RETURNING 
    id,
    created_by,
    category,
    title,
    store
  INTO v_task_record;

  -- Check if update succeeded
  IF v_task_record.id IS NULL THEN
    -- Determine specific error
    SELECT created_by INTO v_task_record.created_by 
    FROM tasks 
    WHERE id = task_id;
    
    IF v_task_record.created_by IS NULL THEN
      RAISE EXCEPTION 'Task not found';
    ELSIF v_task_record.created_by = v_user_id THEN
      RAISE EXCEPTION 'Cannot accept your own task';
    ELSE
      RAISE EXCEPTION 'Task is no longer available for acceptance';
    END IF;
  END IF;

  -- Create chat room for this task
  INSERT INTO chat_rooms (task_id, created_at)
  VALUES (task_id, now())
  RETURNING id INTO v_chat_room_id;

  -- Add both users as chat members
  INSERT INTO chat_members (room_id, user_id, unread_count, last_read_at)
  VALUES 
    (v_chat_room_id, v_task_record.created_by, 0, now()),
    (v_chat_room_id, v_user_id, 0, now());

  -- Post system message with acceptance code
  INSERT INTO chat_messages (room_id, sender_id, text, created_at)
  VALUES (
    v_chat_room_id, 
    v_user_id, 
    'Task accepted! Acceptance code: ' || v_acceptance_code || ' 🎉',
    now()
  );

  -- Return success data
  RETURN QUERY SELECT
    v_task_record.id,
    'accepted'::text,
    v_acceptance_code,
    v_chat_room_id,
    v_task_record.category,
    v_user_id,
    v_task_record.created_by,
    now()::timestamptz;
END;
$$;

-- Create ensure_room_for_task function with correct signature
CREATE OR REPLACE FUNCTION ensure_room_for_task(p_task_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_id uuid;
  v_task_record RECORD;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if room already exists
  SELECT id INTO v_room_id
  FROM chat_rooms
  WHERE task_id = p_task_id;

  IF v_room_id IS NOT NULL THEN
    RETURN v_room_id;
  END IF;

  -- Get task details and verify user is involved
  SELECT id, created_by, accepted_by
  INTO v_task_record
  FROM tasks
  WHERE id = p_task_id;

  IF v_task_record.id IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Verify user is either owner or accepter
  IF v_task_record.created_by != v_user_id AND v_task_record.accepted_by != v_user_id THEN
    RAISE EXCEPTION 'You are not involved in this task';
  END IF;

  -- Create new room
  INSERT INTO chat_rooms (task_id, created_at)
  VALUES (p_task_id, now())
  RETURNING id INTO v_room_id;

  -- Add both users as members
  INSERT INTO chat_members (room_id, user_id, unread_count, last_read_at)
  VALUES 
    (v_room_id, v_task_record.created_by, 0, now()),
    (v_room_id, v_task_record.accepted_by, 0, now());

  RETURN v_room_id;
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
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Update member's read status
  UPDATE chat_members
  SET 
    unread_count = 0,
    last_read_at = now()
  WHERE 
    room_id = p_room_id 
    AND user_id = v_user_id;

  -- Mark all messages as read
  INSERT INTO message_reads (message_id, user_id, read_at)
  SELECT m.id, v_user_id, now()
  FROM chat_messages m
  WHERE m.room_id = p_room_id
    AND NOT EXISTS (
      SELECT 1 FROM message_reads mr 
      WHERE mr.message_id = m.id AND mr.user_id = v_user_id
    );
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
    RAISE EXCEPTION 'User not authenticated';
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
  ORDER BY COALESCE(cr.last_message_at, cr.created_at) DESC;
END;
$$;