/*
  # Fix accept_task function with correct enum values and column references

  1. Drop existing function to avoid conflicts
  2. Create new accept_task function with:
     - Correct lowercase enum values ('accepted' not 'Accepted')
     - Explicit table column references to avoid ambiguity
     - Proper security and validation checks
     - Atomic operations to prevent race conditions
*/

-- Drop any existing versions of the function
DROP FUNCTION IF EXISTS accept_task(uuid, uuid);
DROP FUNCTION IF EXISTS accept_task(text, text);

-- Create the accept_task function with correct enum values and explicit column references
CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid, p_user_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  price_cents integer,
  estimated_minutes integer,
  location_text text,
  status task_status,
  created_by uuid,
  accepted_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  category text,
  store text,
  dropoff_address text,
  dropoff_instructions text,
  urgency text,
  reward_cents integer,
  current_status task_current_status,
  last_status_update timestamptz,
  task_current_status task_current_status,
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
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  -- Check if the authenticated user matches the provided user_id
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- Update the task atomically with proper column references
  RETURN QUERY
  UPDATE tasks t
  SET 
    status = 'accepted'::task_status,
    accepted_by = p_user_id,
    assignee_id = p_user_id,
    task_current_status = 'accepted'::task_current_status,
    accepted_at = now(),
    last_status_update = now(),
    updated_at = now()
  WHERE 
    t.id = p_task_id
    AND t.status = 'open'::task_status
    AND t.created_by != p_user_id
    AND t.moderation_status = 'approved'::task_moderation_status
  RETURNING 
    t.id,
    t.title,
    t.description,
    t.price_cents,
    t.estimated_minutes,
    t.location_text,
    t.status,
    t.created_by,
    t.accepted_by,
    t.created_at,
    t.updated_at,
    t.category,
    t.store,
    t.dropoff_address,
    t.dropoff_instructions,
    t.urgency,
    t.reward_cents,
    t.current_status,
    t.last_status_update,
    t.task_current_status,
    t.accepted_at,
    t.assignee_id,
    t.phase,
    t.moderation_status,
    t.moderation_reason,
    t.moderated_at,
    t.moderated_by;

  -- Check if any rows were affected
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_AVAILABLE';
  END IF;
END;
$$;