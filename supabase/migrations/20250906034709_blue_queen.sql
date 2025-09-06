/*
  # Drop and recreate accept_task function

  1. Drop existing function
    - Remove any existing accept_task function definitions
  
  2. Create new accept_task function
    - Generate unique UUID code for user
    - Update task status to 'accepted'
    - Assign task to user
    - Set accepted_at timestamp
    - Return updated task data
  
  3. Security
    - Atomic transaction with proper locking
    - Validate task availability
    - Prevent self-acceptance
    - Handle race conditions
*/

-- Drop existing accept_task function if it exists
DROP FUNCTION IF EXISTS accept_task(uuid, uuid);
DROP FUNCTION IF EXISTS accept_task(text, text);
DROP FUNCTION IF EXISTS accept_task(uuid);

-- Create new accept_task function with unique code generation
CREATE OR REPLACE FUNCTION accept_task(
  p_task_id uuid,
  p_user_id uuid
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  category task_category,
  store text,
  dropoff_address text,
  dropoff_instructions text,
  urgency task_urgency,
  reward_cents integer,
  estimated_minutes integer,
  status task_status,
  created_by uuid,
  accepted_by uuid,
  accepted_at timestamptz,
  user_accept_code uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record tasks%ROWTYPE;
  unique_code uuid;
BEGIN
  -- Generate unique code
  unique_code := gen_random_uuid();
  
  -- Lock and update the task atomically
  UPDATE tasks 
  SET 
    status = 'accepted'::task_status,
    accepted_by = p_user_id,
    accepted_at = now(),
    user_accept_code = unique_code,
    updated_at = now()
  WHERE 
    tasks.id = p_task_id
    AND tasks.status = 'open'::task_status
    AND tasks.created_by != p_user_id
    AND tasks.accepted_by IS NULL
  RETURNING * INTO task_record;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    -- Determine specific error reason
    SELECT * INTO task_record FROM tasks WHERE tasks.id = p_task_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'TASK_NOT_FOUND';
    ELSIF task_record.created_by = p_user_id THEN
      RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
    ELSIF task_record.status != 'open'::task_status THEN
      RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
    ELSE
      RAISE EXCEPTION 'TASK_ACCEPTANCE_FAILED';
    END IF;
  END IF;
  
  -- Return the updated task
  RETURN QUERY
  SELECT 
    task_record.id,
    task_record.title,
    task_record.description,
    task_record.category,
    task_record.store,
    task_record.dropoff_address,
    task_record.dropoff_instructions,
    task_record.urgency,
    task_record.reward_cents,
    task_record.estimated_minutes,
    task_record.status,
    task_record.created_by,
    task_record.accepted_by,
    task_record.accepted_at,
    task_record.user_accept_code,
    task_record.created_at,
    task_record.updated_at;
END;
$$;