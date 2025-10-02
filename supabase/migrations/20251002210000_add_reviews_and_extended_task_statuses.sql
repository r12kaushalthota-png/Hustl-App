/*
  # Add Reviews and Extended Task Statuses

  1. New Tables
    - `reviews` - Store ratings and comments for completed tasks

  2. Changes
    - Add support for extended task statuses (en_route, arrived, picked_up, delivered)
    - Update task_status_history CHECK constraint to include new statuses

  3. Security
    - Enable RLS on reviews table
    - Only task participants can leave reviews
    - Reviews can only be left for completed tasks
    - Each user can only review once per task

  4. Notes
    - Reviews are tied to tasks, not individual users
    - Both poster and doer can leave reviews
    - Rating is 1-5 stars
    - Comment is optional
*/

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, reviewer_id)
);

-- Create index for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_task_id ON reviews(task_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);

-- Enable RLS on reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Reviews policies
CREATE POLICY "Task participants can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = reviews.task_id
      AND (tasks.created_by = auth.uid() OR tasks.accepted_by = auth.uid())
    )
  );

CREATE POLICY "Task participants can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = reviews.task_id
      AND tasks.status = 'completed'
      AND (
        (tasks.created_by = auth.uid() AND tasks.accepted_by = reviewee_id) OR
        (tasks.accepted_by = auth.uid() AND tasks.created_by = reviewee_id)
      )
    )
  );

-- Drop existing CHECK constraint on task_status_history if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'task_status_history' AND constraint_name LIKE '%status_check%'
  ) THEN
    ALTER TABLE task_status_history DROP CONSTRAINT IF EXISTS task_status_history_status_check;
  END IF;
END $$;

-- Add new CHECK constraint with extended statuses
ALTER TABLE task_status_history
  ADD CONSTRAINT task_status_history_status_check
  CHECK (status IN ('accepted', 'en_route', 'arrived', 'picked_up', 'delivered', 'completed', 'cancelled'));

-- Function: Get reviews for a user
CREATE OR REPLACE FUNCTION get_user_reviews(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  task_id uuid,
  reviewer_id uuid,
  reviewer_name text,
  reviewer_avatar_url text,
  rating integer,
  comment text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.task_id,
    r.reviewer_id,
    p.full_name as reviewer_name,
    p.avatar_url as reviewer_avatar_url,
    r.rating,
    r.comment,
    r.created_at
  FROM reviews r
  JOIN profiles p ON p.id = r.reviewer_id
  WHERE r.reviewee_id = p_user_id
  ORDER BY r.created_at DESC;
END;
$$;

-- Function: Check if user can leave a review for a task
CREATE OR REPLACE FUNCTION can_leave_review(p_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_task_row tasks%ROWTYPE;
  v_existing_review uuid;
BEGIN
  -- Get task
  SELECT * INTO v_task_row FROM tasks WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if task is completed
  IF v_task_row.status != 'completed' THEN
    RETURN false;
  END IF;

  -- Check if user is participant
  IF v_task_row.created_by != auth.uid() AND v_task_row.accepted_by != auth.uid() THEN
    RETURN false;
  END IF;

  -- Check if user already left a review
  SELECT id INTO v_existing_review
  FROM reviews
  WHERE task_id = p_task_id AND reviewer_id = auth.uid();

  IF v_existing_review IS NOT NULL THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Grant permissions
GRANT ALL ON reviews TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_reviews TO authenticated;
GRANT EXECUTE ON FUNCTION can_leave_review TO authenticated;
