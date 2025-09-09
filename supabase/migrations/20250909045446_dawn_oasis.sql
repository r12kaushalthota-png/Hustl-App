/*
  # Fix accept_task function with proper column qualification

  This migration drops and recreates the accept_task function to fix ambiguous column reference errors.
  
  1. Drops existing accept_task function
  2. Creates new function with properly qualified column references
  3. Uses only existing columns from the tasks table
  4. Returns proper response data for the frontend
*/

-- Drop existing function first
DROP FUNCTION IF EXISTS accept_task(uuid);

-- Create the accept_task function with proper column qualification
CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid)
RETURNS TABLE (
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
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Generate 5-digit acceptance code
  v_acceptance_code := LPAD(FLOOR(RANDOM() * 90000 + 10000)::text, 5, '0');

  -- Lock and update the task atomically
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
    -- Check specific failure reasons
    SELECT * INTO v_task_record FROM tasks WHERE id = p_task_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Task not found';
    ELSIF v_task_record.created_by = v_user_id THEN
      RAISE EXCEPTION 'Cannot accept your own task';
    ELSIF v_task_record.status != 'open' THEN
      RAISE EXCEPTION 'Task is not available for acceptance';
    ELSE
      RAISE EXCEPTION 'Task already been accepted by someone else';
    END IF;
  END IF;

  -- Create chat room for the task
  INSERT INTO chat_rooms (task_id)
  VALUES (p_task_id)
  ON CONFLICT (task_id) DO NOTHING
  RETURNING id INTO v_chat_room_id;

  -- If room already existed, get its ID
  IF v_chat_room_id IS NULL THEN
    SELECT id INTO v_chat_room_id FROM chat_rooms WHERE task_id = p_task_id;
  END IF;

  -- Add both users to the chat room
  INSERT INTO chat_members (room_id, user_id)
  VALUES 
    (v_chat_room_id, v_task_record.created_by),
    (v_chat_room_id, v_user_id)
  ON CONFLICT (room_id, user_id) DO NOTHING;

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