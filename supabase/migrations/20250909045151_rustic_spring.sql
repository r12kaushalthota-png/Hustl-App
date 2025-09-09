/*
  # Fix accept_task function

  1. Drop existing accept_task function that has wrong signature
  2. Create new accept_task function with proper return type
  3. Ensure all column references use actual table columns only

  This fixes the "cannot change return type of existing function" error.
*/

-- Drop the existing accept_task function completely
DROP FUNCTION IF EXISTS accept_task(uuid);
DROP FUNCTION IF EXISTS accept_task(text);
DROP FUNCTION IF EXISTS accept_task;

-- Create the new accept_task function with proper signature
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
  v_user_id uuid;
  v_acceptance_code text;
  v_chat_room_id uuid;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Generate 5-digit acceptance code
  v_acceptance_code := LPAD((RANDOM() * 99999)::int::text, 5, '0');

  -- Try to accept the task atomically
  UPDATE tasks 
  SET 
    status = 'accepted',
    accepted_by = v_user_id,
    accepted_at = NOW(),
    user_accept_code = gen_random_uuid(),
    updated_at = NOW()
  WHERE 
    id = p_task_id 
    AND status = 'open'
    AND created_by != v_user_id
  RETURNING * INTO v_task_record;

  -- Check if update was successful
  IF NOT FOUND THEN
    -- Check why it failed
    SELECT * INTO v_task_record FROM tasks WHERE id = p_task_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Task not found';
    ELSIF v_task_record.created_by = v_user_id THEN
      RAISE EXCEPTION 'Cannot accept your own task';
    ELSIF v_task_record.status != 'open' THEN
      RAISE EXCEPTION 'Task has already been accepted by someone else';
    ELSE
      RAISE EXCEPTION 'Task is not available for acceptance';
    END IF;
  END IF;

  -- Create chat room for the task
  INSERT INTO chat_rooms (task_id)
  VALUES (p_task_id)
  RETURNING id INTO v_chat_room_id;

  -- Add both users to the chat room
  INSERT INTO chat_members (room_id, user_id, unread_count, last_read_at)
  VALUES 
    (v_chat_room_id, v_task_record.created_by, 0, NOW()),
    (v_chat_room_id, v_user_id, 0, NOW());

  -- Return the result
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