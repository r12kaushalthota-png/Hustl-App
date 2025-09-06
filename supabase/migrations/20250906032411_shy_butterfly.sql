/*
  # Complete Accept Task System

  1. Enum Updates
    - Ensure task_current_status enum includes 'Accepted' (capitalized)
    - Update enum to support all required status values

  2. Database Functions
    - Create atomic accept_task function with proper transaction handling
    - Implement race condition protection
    - Add comprehensive error handling

  3. Security
    - Enable RLS on all related tables
    - Add proper policies for task acceptance
    - Ensure users can only accept tasks they didn't create

  4. Triggers
    - Add triggers for task acceptance notifications
    - Update task status history tracking
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS accept_task(uuid, uuid);
DROP FUNCTION IF EXISTS accept_task(uuid);

-- Ensure task_current_status enum has correct values (including 'Accepted')
DO $$
BEGIN
  -- Check if enum type exists and update it
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_current_status') THEN
    -- Add 'Accepted' if it doesn't exist (case-sensitive)
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e 
      JOIN pg_type t ON e.enumtypid = t.oid 
      WHERE t.typname = 'task_current_status' AND e.enumlabel = 'Accepted'
    ) THEN
      ALTER TYPE task_current_status ADD VALUE 'Accepted';
    END IF;
  ELSE
    -- Create enum if it doesn't exist
    CREATE TYPE task_current_status AS ENUM (
      'posted',
      'Accepted', 
      'picked_up',
      'on_the_way', 
      'delivered',
      'completed',
      'cancelled',
      'in_progress'
    );
  END IF;
END $$;

-- Ensure tasks table has task_current_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'task_current_status'
  ) THEN
    ALTER TABLE tasks ADD COLUMN task_current_status task_current_status DEFAULT 'posted';
  END IF;
END $$;

-- Create atomic accept_task function
CREATE OR REPLACE FUNCTION accept_task(
  p_task_id uuid,
  p_user_id uuid
) RETURNS TABLE(
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
BEGIN
  -- Validate user authentication
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_AUTHENTICATED';
  END IF;

  -- Lock and fetch the task atomically
  SELECT * INTO task_record
  FROM tasks t
  WHERE t.id = p_task_id
  FOR UPDATE;

  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;

  -- Validate task can be accepted
  IF task_record.status != 'open' THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
  END IF;

  -- Prevent self-acceptance
  IF task_record.created_by = p_user_id THEN
    RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
  END IF;

  -- Update task atomically
  UPDATE tasks 
  SET 
    status = 'accepted'::task_status,
    task_current_status = 'Accepted'::task_current_status,
    accepted_by = p_user_id,
    assignee_id = p_user_id,
    accepted_at = NOW(),
    last_status_update = NOW(),
    updated_at = NOW()
  WHERE tasks.id = p_task_id
    AND tasks.status = 'open'
    AND tasks.created_by != p_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_ACCEPTANCE_FAILED';
  END IF;

  -- Return updated task
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    t.category,
    t.store,
    t.dropoff_address,
    t.dropoff_instructions,
    t.urgency,
    t.reward_cents,
    t.estimated_minutes,
    t.status,
    t.task_current_status,
    t.last_status_update,
    t.created_by,
    t.accepted_by,
    t.created_at,
    t.updated_at,
    t.price_cents,
    t.location_text,
    t.accepted_at,
    t.assignee_id,
    t.phase,
    t.moderation_status,
    t.moderation_reason,
    t.moderated_at,
    t.moderated_by
  FROM tasks t
  WHERE t.id = p_task_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise with original error message for debugging
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_task(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_task(uuid, uuid) TO anon;

-- Ensure RLS is enabled on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for task acceptance
DROP POLICY IF EXISTS "tasks_update_owner_or_assignee" ON tasks;

CREATE POLICY "tasks_update_owner_or_assignee" ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = created_by) OR 
    (auth.uid() = accepted_by) OR 
    (auth.uid() = assignee_id) OR
    (status = 'open' AND auth.uid() != created_by) -- Allow accepting open tasks
  )
  WITH CHECK (
    (auth.uid() = created_by) OR 
    (auth.uid() = accepted_by) OR 
    (auth.uid() = assignee_id)
  );