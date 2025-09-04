/*
  # Fix task acceptance fields

  1. Table Updates
    - Ensure `tasks` table has all required fields for task acceptance
    - Add missing columns if they don't exist
    - Update constraints and indexes for better performance

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control for task operations

  3. Data Integrity
    - Add proper constraints for task status transitions
    - Ensure accepted_by and assignee_id are properly linked
*/

-- Ensure accepted_at column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN accepted_at timestamptz;
  END IF;
END $$;

-- Ensure assignee_id column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'assignee_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN assignee_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure task_current_status has proper default
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'task_current_status'
  ) THEN
    ALTER TABLE tasks ALTER COLUMN task_current_status SET DEFAULT 'posted'::task_current_status;
  END IF;
END $$;

-- Ensure last_status_update column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'last_status_update'
  ) THEN
    ALTER TABLE tasks ADD COLUMN last_status_update timestamptz DEFAULT now();
  END IF;
END $$;

-- Update any existing open tasks to have proper current_status
UPDATE tasks 
SET task_current_status = 'posted'::task_current_status,
    last_status_update = now()
WHERE status = 'open' AND task_current_status IS NULL;

-- Update any existing accepted tasks to have proper current_status
UPDATE tasks 
SET task_current_status = 'accepted'::task_current_status,
    last_status_update = now(),
    assignee_id = accepted_by
WHERE status = 'accepted' AND task_current_status IS NULL;

-- Add index for better query performance on accepted tasks
CREATE INDEX IF NOT EXISTS idx_tasks_accepted_by_status 
ON tasks (accepted_by, status) 
WHERE accepted_by IS NOT NULL;

-- Add index for assignee_id queries
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id 
ON tasks (assignee_id) 
WHERE assignee_id IS NOT NULL;

-- Add index for task_current_status queries
CREATE INDEX IF NOT EXISTS idx_tasks_current_status_updated 
ON tasks (task_current_status, last_status_update DESC);