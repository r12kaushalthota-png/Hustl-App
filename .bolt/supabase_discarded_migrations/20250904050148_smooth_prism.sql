/*
  # Implement Atomic Task Acceptance

  1. Database Schema Updates
    - Add missing columns to tasks table (accepted_by, accepted_at, status enum)
    - Update existing data to use proper status values
    - Add indexes for performance

  2. Postgres Functions
    - `accept_task(task_id, user_id)` - Atomic task acceptance with race condition protection
    - Custom exception handling for TASK_ALREADY_ACCEPTED

  3. Security (RLS)
    - Policy for reading open tasks
    - Policy for assignees to update their accepted tasks
    - Policy for task creators to read their tasks

  4. Performance
    - Indexes on status, accepted_by, and accepted_at columns
    - Optimized queries for common access patterns
*/

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add accepted_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'accepted_by'
  ) THEN
    ALTER TABLE tasks ADD COLUMN accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Add accepted_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN accepted_at timestamptz;
  END IF;
END $$;

-- Update status column to use proper enum values if needed
DO $$
BEGIN
  -- Update any existing 'posted' status to 'open'
  UPDATE tasks SET status = 'open' WHERE status = 'posted';
  
  -- Update any existing 'in_progress' status to 'accepted'
  UPDATE tasks SET status = 'accepted' WHERE status = 'in_progress';
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status_open ON tasks (status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_tasks_accepted_by ON tasks (accepted_by) WHERE accepted_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_accepted_at ON tasks (accepted_at DESC) WHERE accepted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status_accepted_by ON tasks (status, accepted_by) WHERE status = 'accepted';

-- Create atomic task acceptance function
CREATE OR REPLACE FUNCTION public.accept_task(
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
  updated_row tasks%ROWTYPE;
BEGIN
  -- Atomic update with proper conditions
  UPDATE tasks
  SET 
    status = 'accepted',
    accepted_by = p_user_id,
    accepted_at = now(),
    task_current_status = 'accepted',
    last_status_update = now(),
    updated_at = now()
  WHERE 
    tasks.id = p_task_id
    AND tasks.status = 'open'
    AND tasks.created_by != p_user_id
    AND tasks.accepted_by IS NULL
  RETURNING * INTO updated_row;

  -- Check if any row was updated
  IF NOT FOUND THEN
    -- Check specific failure reasons
    DECLARE
      task_record RECORD;
    BEGIN
      SELECT tasks.status, tasks.created_by, tasks.accepted_by
      INTO task_record
      FROM tasks
      WHERE tasks.id = p_task_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'TASK_NOT_FOUND';
      ELSIF task_record.created_by = p_user_id THEN
        RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
      ELSIF task_record.status != 'open' THEN
        RAISE EXCEPTION 'TASK_NOT_OPEN';
      ELSIF task_record.accepted_by IS NOT NULL THEN
        RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
      ELSE
        RAISE EXCEPTION 'TASK_ACCEPTANCE_FAILED';
      END IF;
    END;
  END IF;

  -- Return the updated task
  RETURN QUERY
  SELECT 
    updated_row.id,
    updated_row.title,
    updated_row.description,
    updated_row.category,
    updated_row.store,
    updated_row.dropoff_address,
    updated_row.dropoff_instructions,
    updated_row.urgency,
    updated_row.reward_cents,
    updated_row.estimated_minutes,
    updated_row.status,
    updated_row.task_current_status,
    updated_row.last_status_update,
    updated_row.created_by,
    updated_row.accepted_by,
    updated_row.accepted_at,
    updated_row.created_at,
    updated_row.updated_at;
END;
$$;

-- Add RLS policies for task access

-- Policy: Users can read open tasks
CREATE POLICY "users_can_read_open_tasks" ON tasks
  FOR SELECT
  TO authenticated
  USING (status = 'open' OR created_by = auth.uid() OR accepted_by = auth.uid());

-- Policy: Users can update tasks they've accepted
CREATE POLICY "assignees_can_update_accepted_tasks" ON tasks
  FOR UPDATE
  TO authenticated
  USING (accepted_by = auth.uid())
  WITH CHECK (accepted_by = auth.uid());

-- Policy: Task creators can update their own tasks
CREATE POLICY "creators_can_update_own_tasks" ON tasks
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.accept_task(uuid, uuid) TO authenticated;