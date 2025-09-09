/*
  # Fix tasks table INSERT policy

  1. Security Changes
    - Drop existing conflicting INSERT policies
    - Add proper INSERT policy for authenticated users to create their own tasks
    - Ensure users can only insert tasks where they are the creator

  This resolves the RLS violation error when creating new tasks.
*/

-- Drop any existing INSERT policies that might be conflicting
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_owner" ON tasks;

-- Create a single, clear INSERT policy for tasks
CREATE POLICY "authenticated_users_can_insert_own_tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Also ensure we have proper SELECT policies for task visibility
DROP POLICY IF EXISTS "tasks_select_public" ON tasks;

CREATE POLICY "users_can_view_tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    status = 'open' OR 
    created_by = auth.uid() OR 
    accepted_by = auth.uid()
  );