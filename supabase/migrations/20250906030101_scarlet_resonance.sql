/*
  # Fix task_current_status enum and accept_task function

  1. Enum Updates
    - Ensure task_current_status enum has correct lowercase values
    - Add 'accepted' if missing from enum definition
  
  2. Function Updates  
    - Drop and recreate accept_task function with correct enum values
    - Use lowercase 'accepted' for task_current_status
    - Maintain all security and validation logic
    
  3. Security
    - Preserve all RLS policies and validation checks
    - Maintain atomic operations to prevent race conditions
*/

-- First, let's ensure the enum has the correct values
-- Check if 'accepted' exists in task_current_status enum, if not add it
DO $$
BEGIN
  -- Check if 'accepted' value exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'accepted' 
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'task_current_status'
    )
  ) THEN
    -- Add 'accepted' to the enum if it doesn't exist
    ALTER TYPE task_current_status ADD VALUE 'accepted';
  END IF;
END $$;

-- Drop the existing accept_task function completely
DROP FUNCTION IF EXISTS accept_task(uuid);
DROP FUNCTION IF EXISTS accept_task(uuid, uuid);
DROP FUNCTION IF EXISTS public.accept_task(uuid);
DROP FUNCTION IF EXISTS public.accept_task(uuid, uuid);

-- Create the accept_task function with correct enum values
CREATE OR REPLACE FUNCTION accept_task(
  p_task_id uuid,
  p_user_id uuid
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  category text,
  store text,
  dropoff_address text,
  dropoff_instructions text,
  urgency text,
  reward_cents integer,
  estimated_minutes integer,
  status task_status,
  task_current_status task_current_status,
  last_status_update timestamptz,
  created_by uuid,
  accepted_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  price_cents integer,
  location_text text,
  accepted_at timestamptz,
  assignee_id uuid,
  phase task_phase,
  moderation_status task_moderation_status,
  moderation_reason text,
  moderated_at timestamptz,
  moderated_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record RECORD;
  updated_task RECORD;
BEGIN
  -- Validate input parameters
  IF p_task_id IS NULL THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;
  
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_AUTHENTICATED';
  END IF;

  -- Get current user ID from auth context
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_AUTHENTICATED';
  END IF;
  
  -- Verify the user ID matches the authenticated user
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'USER_NOT_AUTHENTICATED';
  END IF;

  -- Lock and fetch the task for update
  SELECT * INTO task_record
  FROM tasks 
  WHERE id = p_task_id
  FOR UPDATE;

  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;

  -- Validate task can be accepted
  IF task_record.status != 'open' THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
  END IF;

  -- Prevent users from accepting their own tasks
  IF task_record.created_by = p_user_id THEN
    RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
  END IF;

  -- Update task with acceptance (using lowercase enum values)
  UPDATE tasks 
  SET 
    status = 'accepted'::task_status,
    task_current_status = 'accepted'::task_current_status,
    accepted_by = p_user_id,
    assignee_id = p_user_id,
    accepted_at = now(),
    last_status_update = now(),
    updated_at = now()
  WHERE id = p_task_id
    AND status = 'open'
    AND created_by != p_user_id
  RETURNING * INTO updated_task;

  -- Verify the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
  END IF;

  -- Return the updated task
  RETURN QUERY
  SELECT 
    updated_task.id,
    updated_task.title,
    updated_task.description,
    updated_task.category,
    updated_task.store,
    updated_task.dropoff_address,
    updated_task.dropoff_instructions,
    updated_task.urgency,
    updated_task.reward_cents,
    updated_task.estimated_minutes,
    updated_task.status,
    updated_task.task_current_status,
    updated_task.last_status_update,
    updated_task.created_by,
    updated_task.accepted_by,
    updated_task.created_at,
    updated_task.updated_at,
    updated_task.price_cents,
    updated_task.location_text,
    updated_task.accepted_at,
    updated_task.assignee_id,
    updated_task.phase,
    updated_task.moderation_status,
    updated_task.moderation_reason,
    updated_task.moderated_at,
    updated_task.moderated_by;

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception with the original message
    RAISE;
END;
$$;