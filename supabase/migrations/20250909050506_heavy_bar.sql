/*
  # Fix accept_task function by removing problematic triggers

  This migration:
  1. Drops all triggers that reference nonexistent columns
  2. Creates a simple, working accept_task function
  3. Uses only columns that actually exist in the tasks table
*/

-- Drop all problematic triggers that reference nonexistent columns
DROP TRIGGER IF EXISTS tasks_after_update_status_notification ON tasks;
DROP TRIGGER IF EXISTS trg_task_updated_notifications ON tasks;
DROP TRIGGER IF EXISTS trg_task_status_updated ON tasks;

-- Drop the problematic trigger functions
DROP FUNCTION IF EXISTS trg_task_status_updated();
DROP FUNCTION IF EXISTS notify_task_updated();

-- Drop existing accept_task function
DROP FUNCTION IF EXISTS accept_task(uuid);
DROP FUNCTION IF EXISTS accept_task(text);

-- Create simple, working accept_task function
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
  v_task_record tasks%ROWTYPE;
  v_user_id uuid;
  v_acceptance_code uuid;
  v_display_code text;
  v_chat_room_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
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
  IF v_task_record.created_by = v_user_id THEN
    RAISE EXCEPTION 'Cannot accept your own task';
  END IF;

  -- Generate acceptance code
  v_acceptance_code := gen_random_uuid();
  v_display_code := LPAD((ABS(HASHTEXT(v_acceptance_code::text)) % 100000)::text, 5, '0');

  -- Update task to accepted status
  UPDATE tasks 
  SET 
    status = 'accepted',
    accepted_by = v_user_id,
    accepted_at = NOW(),
    user_accept_code = v_acceptance_code,
    updated_at = NOW()
  WHERE id = p_task_id;

  -- Create chat room for the task
  INSERT INTO chat_rooms (task_id, created_at)
  VALUES (p_task_id, NOW())
  RETURNING id INTO v_chat_room_id;

  -- Add both users to the chat room
  INSERT INTO chat_members (room_id, user_id, unread_count, last_read_at)
  VALUES 
    (v_chat_room_id, v_task_record.created_by, 0, NOW()),
    (v_chat_room_id, v_user_id, 0, NOW());

  -- Return the result
  RETURN QUERY SELECT 
    p_task_id,
    'accepted'::text,
    v_display_code,
    v_chat_room_id,
    v_task_record.category::text,
    v_user_id,
    v_task_record.created_by,
    NOW();
END;
$$;