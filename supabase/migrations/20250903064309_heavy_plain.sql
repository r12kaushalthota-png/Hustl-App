/*
  # Add accept_task RPC function

  1. New Functions
    - `accept_task` - Atomically accepts a task and assigns it to the authenticated user
      - Takes `p_task_id` parameter
      - Returns updated task record
      - Handles race conditions with proper locking
      - Validates task is still available

  2. Security
    - Function is SECURITY DEFINER to ensure proper access control
    - Only authenticated users can call the function
    - Validates user is not the task creator
    - Ensures task is in 'open' status before accepting

  3. Race Condition Protection
    - Uses atomic UPDATE with WHERE conditions
    - Returns null if task is no longer available
    - Prevents double-acceptance scenarios
*/

-- Create the accept_task RPC function
CREATE OR REPLACE FUNCTION public.accept_task(p_task_id uuid)
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
  status text,
  current_status text,
  last_status_update timestamptz,
  created_by uuid,
  accepted_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_task_row public.tasks%ROWTYPE;
BEGIN
  -- Get authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Atomically update task if it's still available
  UPDATE public.tasks
  SET 
    status = 'accepted',
    current_status = 'accepted',
    accepted_by = v_user_id,
    last_status_update = NOW(),
    updated_at = NOW()
  WHERE tasks.id = p_task_id
    AND tasks.status = 'open'
    AND tasks.accepted_by IS NULL
    AND tasks.created_by != v_user_id
  RETURNING * INTO v_task_row;

  -- Check if update was successful
  IF NOT FOUND THEN
    -- Task is no longer available or user is not eligible
    RETURN;
  END IF;

  -- Return the updated task
  RETURN QUERY
  SELECT 
    v_task_row.id,
    v_task_row.title,
    v_task_row.description,
    v_task_row.category,
    v_task_row.store,
    v_task_row.dropoff_address,
    v_task_row.dropoff_instructions,
    v_task_row.urgency,
    v_task_row.reward_cents,
    v_task_row.estimated_minutes,
    v_task_row.status,
    v_task_row.current_status,
    v_task_row.last_status_update,
    v_task_row.created_by,
    v_task_row.accepted_by,
    v_task_row.created_at,
    v_task_row.updated_at;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_task TO authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';