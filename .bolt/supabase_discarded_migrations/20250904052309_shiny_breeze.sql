/*
  # Convert task_category enum to TEXT

  1. Database Changes
    - Convert tasks.category column from task_category enum to TEXT
    - Drop task_category enum type if it exists
    - Update accept_task RPC function to work with TEXT
    - Add check constraint for valid categories

  2. Security
    - Maintain existing RLS policies
    - Ensure accept_task function works with current user context

  3. Data Safety
    - Use safe conversion with USING clause
    - Preserve all existing category values
*/

-- First, ensure we have a working accept_task function that doesn't reference the enum
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
  status text,
  task_current_status text,
  last_status_update timestamptz,
  created_by uuid,
  accepted_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  accepted_at timestamptz,
  assignee_id uuid,
  phase text,
  moderation_status text,
  moderation_reason text,
  moderated_at timestamptz,
  moderated_by uuid,
  price_cents integer,
  location_text text,
  current_status text
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
    RAISE EXCEPTION 'UNAUTHORIZED: Must be authenticated to accept tasks';
  END IF;

  -- Fetch and lock the task
  SELECT * INTO task_record
  FROM tasks t
  WHERE t.id = task_id
  FOR UPDATE;

  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND: Task not found or no longer available';
  END IF;

  -- Validate task can be accepted
  IF task_record.created_by = current_user_id THEN
    RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK: You cannot accept your own task';
  END IF;

  IF task_record.status != 'open' THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED: Task is no longer available';
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
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED: Task was accepted by another user';
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
    t.price_cents,
    t.location_text,
    t.current_status
  FROM tasks t
  WHERE t.id = task_id;
END;
$$;

-- Convert category column to TEXT if it's currently an enum
DO $$
BEGIN
  -- Check if the column exists and what type it is
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'category'
    AND table_schema = 'public'
  ) THEN
    -- Convert to TEXT using USING clause to handle any type conversion
    ALTER TABLE tasks 
    ALTER COLUMN category TYPE text 
    USING category::text;
    
    -- Set default value
    ALTER TABLE tasks 
    ALTER COLUMN category SET DEFAULT 'food';
  END IF;
END $$;

-- Drop the enum type if it exists
DROP TYPE IF EXISTS task_category CASCADE;

-- Add check constraint for valid categories
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE table_name = 'tasks' 
    AND constraint_name = 'tasks_category_check'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE tasks DROP CONSTRAINT tasks_category_check;
  END IF;
  
  -- Add new text-based constraint
  ALTER TABLE tasks 
  ADD CONSTRAINT tasks_category_check 
  CHECK (category IN ('food', 'grocery', 'coffee'));
END $$;