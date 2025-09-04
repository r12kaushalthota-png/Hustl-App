/*
  # Convert task_category enum to TEXT

  1. Column Changes
    - Convert `tasks.category` from task_category enum to TEXT
    - Remove enum constraint and add text-based constraint
    - Update RPC function to work with TEXT

  2. Function Updates
    - Update accept_task function to return TEXT category
    - Remove all enum casting

  3. Cleanup
    - Drop task_category enum type
    - Add performance indexes
*/

-- First, convert the column from enum to text
ALTER TABLE tasks 
ALTER COLUMN category TYPE TEXT USING category::text;

-- Set default value for category
ALTER TABLE tasks 
ALTER COLUMN category SET DEFAULT 'food';

-- Add constraint for allowed category values
ALTER TABLE tasks 
ADD CONSTRAINT tasks_category_text_check 
CHECK (category IN ('food', 'coffee', 'grocery'));

-- Update the accept_task function to work with TEXT
CREATE OR REPLACE FUNCTION accept_task(task_id uuid)
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
  accepted_at timestamptz,
  assignee_id uuid,
  phase task_phase,
  moderation_status task_moderation_status,
  moderation_reason text,
  moderated_at timestamptz,
  moderated_by uuid,
  price_cents integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  task_record record;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;

  -- Lock and fetch the task
  SELECT * INTO task_record
  FROM tasks t
  WHERE t.id = task_id
  FOR UPDATE;

  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;

  -- Check if user is trying to accept their own task
  IF task_record.created_by = current_user_id THEN
    RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
  END IF;

  -- Check if task is still open
  IF task_record.status != 'open' THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
  END IF;

  -- Update task atomically
  UPDATE tasks
  SET 
    status = 'accepted',
    accepted_by = current_user_id,
    accepted_at = NOW(),
    assignee_id = current_user_id,
    task_current_status = 'accepted',
    last_status_update = NOW(),
    updated_at = NOW()
  WHERE tasks.id = task_id
    AND tasks.status = 'open'
    AND tasks.created_by != current_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
  END IF;

  -- Return the updated task
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
    t.accepted_at,
    t.assignee_id,
    t.phase,
    t.moderation_status,
    t.moderation_reason,
    t.moderated_at,
    t.moderated_by,
    t.price_cents
  FROM tasks t
  WHERE t.id = task_id;
END;
$$;

-- Drop the task_category enum if it exists
DROP TYPE IF EXISTS task_category CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_category_status 
ON tasks(category, status) 
WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_tasks_accepted_by_category 
ON tasks(accepted_by, category) 
WHERE accepted_by IS NOT NULL;