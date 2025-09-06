/*
  # Drop assignee_id column and all dependencies

  This migration removes the assignee_id column from the tasks table along with all
  dependent policies and functions that reference it.

  1. Dependencies Removed
    - task_progress_select_for_task_members policy
    - task_progress_insert_for_task_members policy  
    - tasks_update_owner_or_assignee policy
    - Any other objects that depend on assignee_id

  2. Column Removal
    - assignee_id column from tasks table (with CASCADE)

  This cleans up the database schema to focus only on the core task acceptance
  functionality with user_accept_code.
*/

-- Drop the assignee_id column and all its dependencies using CASCADE
-- This will automatically remove any policies, functions, or other objects
-- that depend on this column
ALTER TABLE tasks DROP COLUMN IF EXISTS assignee_id CASCADE;

-- Verify the column is removed by checking the table structure
-- (This is just for verification - no action needed)
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'tasks' AND column_name = 'assignee_id';