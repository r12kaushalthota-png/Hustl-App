/*
  # Fix task_status enum and implement atomic task acceptance

  1. Enum Updates
    - Remove 'posted' from task_status enum
    - Migrate any 'posted' values to 'open'
    - Update enum to only include: open, accepted, in_progress, completed, cancelled

  2. Atomic Accept Function
    - Create accept_task RPC function with proper enum casting
    - Atomic update from 'open' to 'accepted' with race condition protection
    - Returns updated task row or raises TASK_ALREADY_ACCEPTED error

  3. Security
    - Update RLS policies for new enum values
    - Ensure proper access control for task acceptance
*/

-- Step 1: Update any existing 'posted' values to 'open'
UPDATE tasks 
SET status = 'open'::task_status 
WHERE status::text = 'posted';

UPDATE tasks 
SET task_current_status = 'accepted'::task_current_status 
WHERE task_current_status::text = 'posted';

-- Step 2: Create new enum without 'posted'
DO $$ 
BEGIN
  -- Check if we need to recreate the enum
  IF EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'posted' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'task_status')
  ) THEN
    -- Create new enum without 'posted'
    CREATE TYPE task_status_new AS ENUM ('open', 'accepted', 'in_progress', 'completed', 'cancelled');
    
    -- Update the column to use the new enum
    ALTER TABLE tasks 
    ALTER COLUMN status TYPE task_status_new 
    USING (
      CASE 
        WHEN status::text = 'posted' THEN 'open'::task_status_new
        ELSE status::text::task_status_new
      END
    );
    
    -- Drop old enum and rename new one
    DROP TYPE task_status;
    ALTER TYPE task_status_new RENAME TO task_status;
  END IF;
END $$;

-- Step 3: Ensure required columns exist
DO $$
BEGIN
  -- Add accepted_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'accepted_by'
  ) THEN
    ALTER TABLE tasks ADD COLUMN accepted_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add accepted_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN accepted_at timestamptz;
  END IF;
END $$;

-- Step 4: Create atomic accept_task function
CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid, p_user_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  category task_category,
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
  accepted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_task tasks%ROWTYPE;
BEGIN
  -- Atomic update: only succeed if task is open and not created by user
  UPDATE tasks 
  SET 
    status = 'accepted'::task_status,
    accepted_by = p_user_id,
    accepted_at = now(),
    task_current_status = 'accepted'::task_current_status,
    last_status_update = now(),
    updated_at = now()
  WHERE 
    tasks.id = p_task_id 
    AND tasks.status = 'open'::task_status
    AND tasks.created_by != p_user_id
    AND tasks.accepted_by IS NULL
  RETURNING * INTO updated_task;

  -- Check if update succeeded
  IF NOT FOUND THEN
    -- Check specific failure reasons
    IF EXISTS (
      SELECT 1 FROM tasks 
      WHERE id = p_task_id AND created_by = p_user_id
    ) THEN
      RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
    ELSIF EXISTS (
      SELECT 1 FROM tasks 
      WHERE id = p_task_id AND status != 'open'::task_status
    ) THEN
      RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
    ELSIF NOT EXISTS (
      SELECT 1 FROM tasks WHERE id = p_task_id
    ) THEN
      RAISE EXCEPTION 'TASK_NOT_FOUND';
    ELSE
      RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
    END IF;
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
    updated_task.accepted_at,
    updated_task.created_at,
    updated_task.updated_at;
END;
$$;

-- Step 5: Update RLS policies for new enum values
DROP POLICY IF EXISTS "tasks_select_visible" ON tasks;
CREATE POLICY "tasks_select_visible" ON tasks
  FOR SELECT
  TO authenticated
  USING (
    status = 'open'::task_status 
    OR created_by = uid() 
    OR accepted_by = uid()
  );

DROP POLICY IF EXISTS "tasks_update_owner_or_assignee" ON tasks;
CREATE POLICY "tasks_update_owner_or_assignee" ON tasks
  FOR UPDATE
  TO authenticated
  USING (created_by = uid() OR accepted_by = uid())
  WITH CHECK (created_by = uid() OR accepted_by = uid());

-- Step 6: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status_open ON tasks (status) WHERE status = 'open'::task_status;
CREATE INDEX IF NOT EXISTS idx_tasks_accepted_by_status ON tasks (accepted_by, status) WHERE accepted_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_by_status ON tasks (created_by, status);

-- Step 7: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION accept_task(uuid, uuid) TO authenticated;