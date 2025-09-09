/*
  # Fix accept_task function - remove all ambiguous column references

  This migration completely rewrites the accept_task function to eliminate all ambiguous column references.
  The function will properly accept tasks and return the necessary data without any SQL errors.

  1. Function Changes
    - Drop existing accept_task function completely
    - Create new function with proper column qualification
    - Use explicit table aliases throughout
    - Return proper data structure

  2. Security
    - Maintains existing RLS policies
    - Proper user authentication checks
*/

-- Drop existing function completely
DROP FUNCTION IF EXISTS accept_task(uuid);
DROP FUNCTION IF EXISTS accept_task(text);

-- Create the accept_task function with proper column qualification
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
  v_user_id uuid;
  v_acceptance_code text;
  v_chat_room_id uuid;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Generate 5-digit acceptance code
  v_acceptance_code := LPAD(FLOOR(RANDOM() * 100000)::text, 5, '0');

  -- Lock and get task details
  SELECT tasks.id, tasks.title, tasks.created_by, tasks.accepted_by, tasks.category, tasks.store
  INTO v_task_record
  FROM tasks 
  WHERE tasks.id = p_task_id 
  FOR UPDATE;

  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Check if user can accept this task
  IF v_task_record.created_by = v_user_id THEN
    RAISE EXCEPTION 'Cannot accept your own task';
  END IF;

  IF v_task_record.accepted_by IS NOT NULL THEN
    RAISE EXCEPTION 'Task has already been accepted';
  END IF;

  -- Update task to accepted status
  UPDATE tasks 
  SET 
    accepted_by = v_user_id,
    accepted_at = NOW(),
    user_accept_code = v_acceptance_code::uuid,
    updated_at = NOW()
  WHERE tasks.id = p_task_id;

  -- Create chat room for this task
  INSERT INTO chat_rooms (task_id, created_at)
  VALUES (p_task_id, NOW())
  RETURNING chat_rooms.id INTO v_chat_room_id;

  -- Add both users to the chat room
  INSERT INTO chat_members (room_id, user_id, unread_count, last_read_at)
  VALUES 
    (v_chat_room_id, v_task_record.created_by, 0, NOW()),
    (v_chat_room_id, v_user_id, 0, NOW());

  -- Return the result
  RETURN QUERY SELECT 
    p_task_id,
    'accepted'::text,
    v_acceptance_code,
    v_chat_room_id,
    v_task_record.category,
    v_user_id,
    v_task_record.created_by,
    NOW()::timestamptz;
END;
$$;