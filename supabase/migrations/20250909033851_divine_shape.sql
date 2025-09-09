/*
  # Add INSERT policy for tasks table

  1. Security
    - Add policy for authenticated users to insert their own tasks
    - Ensures users can only create tasks where they are the creator
    - Fixes RLS violation error when posting new tasks

  2. Changes
    - Create INSERT policy "Users can insert their own tasks"
    - Policy allows INSERT when auth.uid() matches created_by field
*/

-- Add INSERT policy for tasks table
CREATE POLICY "Users can insert their own tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);