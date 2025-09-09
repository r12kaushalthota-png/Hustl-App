/*
  # Final Accept Task Function

  1. Function Purpose
    - Accept a task atomically (only one user can accept)
    - Generate acceptance code for verification
    - Create or reuse chat room for communication
    - Return all necessary data to frontend

  2. Security
    - Prevents users from accepting their own tasks
    - Ensures task is available for acceptance
    - Atomic operation to prevent race conditions

  3. Returns
    - task_id: The accepted task ID
    - status: New task status ('accepted')
    - acceptance_code: 5-digit verification code
    - chat_id: Chat room ID for communication
    - task_category: Task category
    - accepted_by: User who accepted the task
    - owner_id: Original task creator
    - accepted_at: Timestamp of acceptance
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS accept_task(uuid);
DROP FUNCTION IF EXISTS accept_task(text);

-- Create the accept_task function
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
  v_user_id uuid;
  v_task_record record;
  v_acceptance_uuid uuid;
  v_acceptance_code text;
  v_chat_room_id uuid;
  v_existing_room_id uuid;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get task details and lock the row
  SELECT * INTO v_task_record
  FROM tasks 
  WHERE id = p_task_id 
  FOR UPDATE;

  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Check if user is trying to accept their own task
  IF v_task_record.created_by = v_user_id THEN
    RAISE EXCEPTION 'Cannot accept your own task';
  END IF;

  -- Check if task is available for acceptance
  IF v_task_record.status != 'open' THEN
    RAISE EXCEPTION 'Task is not available for acceptance';
  END IF;

  -- Generate acceptance code
  v_acceptance_uuid := gen_random_uuid();
  v_acceptance_code := LPAD((ABS(HASHTEXT(v_acceptance_uuid::text)) % 100000)::text, 5, '0');

  -- Update task to accepted status
  UPDATE tasks 
  SET 
    status = 'accepted',
    accepted_by = v_user_id,
    accepted_at = NOW(),
    user_accept_code = v_acceptance_uuid,
    updated_at = NOW()
  WHERE id = p_task_id;

  -- Check if chat room already exists for this task
  SELECT id INTO v_existing_room_id
  FROM chat_rooms 
  WHERE task_id = p_task_id;

  IF v_existing_room_id IS NOT NULL THEN
    -- Use existing chat room
    v_chat_room_id := v_existing_room_id;
  ELSE
    -- Create new chat room
    INSERT INTO chat_rooms (task_id, created_at)
    VALUES (p_task_id, NOW())
    RETURNING id INTO v_chat_room_id;

    -- Add both users as members
    INSERT INTO chat_members (room_id, user_id, unread_count, last_read_at)
    VALUES 
      (v_chat_room_id, v_task_record.created_by, 0, NULL),
      (v_chat_room_id, v_user_id, 0, NULL)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  END IF;

  -- Return success data
  RETURN QUERY SELECT 
    p_task_id as task_id,
    'accepted'::text as status,
    v_acceptance_code as acceptance_code,
    v_chat_room_id as chat_id,
    v_task_record.category as task_category,
    v_user_id as accepted_by,
    v_task_record.created_by as owner_id,
    NOW() as accepted_at;

END;
$$;