/*
  # Fix accept_task function UUID type error

  1. Problem Fixed
    - The user_accept_code column expects UUID but we were storing 5-digit numbers
    - Generate proper UUID for database storage
    - Return 5-digit display code to frontend

  2. Function Changes
    - Store UUID in user_accept_code column
    - Generate 5-digit display code from UUID
    - Return proper data structure to frontend
*/

-- Drop existing function
DROP FUNCTION IF EXISTS accept_task(uuid);

-- Create the accept_task function with proper UUID handling
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
AS $$
DECLARE
  v_task_record RECORD;
  v_current_user_id uuid;
  v_acceptance_uuid uuid;
  v_display_code text;
  v_chat_room_id uuid;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get and lock the task
  SELECT * INTO v_task_record
  FROM tasks 
  WHERE id = p_task_id 
  FOR UPDATE;

  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

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

  -- Create or get chat room for this task
  INSERT INTO chat_rooms (task_id, created_at)
  VALUES (p_task_id, NOW())
  ON CONFLICT (task_id) DO NOTHING;

  -- Get the chat room ID
  SELECT id INTO v_chat_room_id
  FROM chat_rooms
  WHERE task_id = p_task_id;

  -- Add both users to the chat room
  INSERT INTO chat_members (room_id, user_id, unread_count, last_read_at)
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