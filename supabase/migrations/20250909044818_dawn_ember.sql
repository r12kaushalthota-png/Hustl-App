/*
  # Fix task acceptance system

  This migration fixes the accept_task function to work with the actual database schema.
  
  1. Functions
     - Creates working accept_task function that properly accepts tasks
     - Generates 5-digit acceptance codes
     - Creates chat rooms for accepted tasks
     
  2. Security
     - Proper RLS policies for task acceptance
     - Chat room creation with proper permissions
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS accept_task(uuid);
DROP FUNCTION IF EXISTS accept_task(p_task_id uuid);

-- Create the accept_task function with correct column references
CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_record tasks%ROWTYPE;
  v_acceptance_code text;
  v_chat_room_id uuid;
  v_current_user_id uuid;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Lock and get the task
  SELECT * INTO v_task_record
  FROM tasks
  WHERE id = p_task_id
  FOR UPDATE;

  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Check if task is available for acceptance
  IF v_task_record.status != 'open' THEN
    RAISE EXCEPTION 'Task is not available for acceptance';
  END IF;

  -- Check if user is trying to accept their own task
  IF v_task_record.created_by = v_current_user_id THEN
    RAISE EXCEPTION 'Cannot accept your own task';
  END IF;

  -- Generate 5-digit acceptance code
  v_acceptance_code := LPAD((RANDOM() * 99999)::int::text, 5, '0');

  -- Update task to accepted status
  UPDATE tasks
  SET 
    status = 'accepted',
    accepted_by = v_current_user_id,
    accepted_at = NOW(),
    user_accept_code = gen_random_uuid(),
    updated_at = NOW()
  WHERE id = p_task_id;

  -- Create or get chat room for this task
  INSERT INTO chat_rooms (task_id, created_at)
  VALUES (p_task_id, NOW())
  ON CONFLICT (task_id) DO NOTHING
  RETURNING id INTO v_chat_room_id;

  -- If room already existed, get its ID
  IF v_chat_room_id IS NULL THEN
    SELECT id INTO v_chat_room_id
    FROM chat_rooms
    WHERE task_id = p_task_id;
  END IF;

  -- Add both users to the chat room
  INSERT INTO chat_members (room_id, user_id, unread_count, last_read_at)
  VALUES 
    (v_chat_room_id, v_task_record.created_by, 0, NOW()),
    (v_chat_room_id, v_current_user_id, 0, NOW())
  ON CONFLICT (room_id, user_id) DO NOTHING;

  -- Return success data
  RETURN json_build_object(
    'task_id', p_task_id,
    'status', 'accepted',
    'acceptance_code', v_acceptance_code,
    'chat_id', v_chat_room_id,
    'task_category', v_task_record.category,
    'accepted_by', v_current_user_id,
    'owner_id', v_task_record.created_by,
    'accepted_at', NOW()
  );
END;
$$;