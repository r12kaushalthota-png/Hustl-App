/*
  # Add XP and Credit System

  1. Database Changes
    - Add `xp` and `level` columns to profiles table
    - Add `credits` column to profiles table
    - Add level thresholds configuration
    - Add XP transaction history table

  2. Functions
    - Function to calculate level from XP
    - Function to award XP and update level
    - Function to award credits
    - Function to spend credits

  3. Triggers
    - Auto-award XP when tasks are completed
    - Auto-award XP for positive reviews
*/

-- Add XP, level, and credits to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'xp'
  ) THEN
    ALTER TABLE profiles ADD COLUMN xp integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN level integer DEFAULT 1;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'credits'
  ) THEN
    ALTER TABLE profiles ADD COLUMN credits integer DEFAULT 0;
  END IF;
END $$;

-- XP transactions table for tracking XP history
CREATE TABLE IF NOT EXISTS xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  review_id uuid REFERENCES task_reviews(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own XP transactions"
  ON xp_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Credit transactions table for tracking credit history
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'purchased')),
  reason text NOT NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own credit transactions"
  ON credit_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function to calculate level from XP
CREATE OR REPLACE FUNCTION calculate_level_from_xp(xp_amount integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
  -- Level thresholds: 1=0, 2=100, 3=250, 4=500, 5=1000, etc.
  IF xp_amount < 100 THEN RETURN 1;
  ELSIF xp_amount < 250 THEN RETURN 2;
  ELSIF xp_amount < 500 THEN RETURN 3;
  ELSIF xp_amount < 1000 THEN RETURN 4;
  ELSIF xp_amount < 2000 THEN RETURN 5;
  ELSIF xp_amount < 3500 THEN RETURN 6;
  ELSIF xp_amount < 5500 THEN RETURN 7;
  ELSIF xp_amount < 8000 THEN RETURN 8;
  ELSIF xp_amount < 12000 THEN RETURN 9;
  ELSE RETURN 10;
  END IF;
END;
$$;

-- Function to award XP
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_task_id uuid DEFAULT NULL,
  p_review_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  old_level integer;
  new_level integer;
  new_xp integer;
  level_up_credits integer := 0;
BEGIN
  -- Get current XP and level
  SELECT xp, level INTO new_xp, old_level
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  -- Add XP
  new_xp := new_xp + p_amount;
  new_level := calculate_level_from_xp(new_xp);

  -- Calculate level-up credits
  IF new_level > old_level THEN
    level_up_credits := (new_level - old_level) * 500; -- 500 credits per level
  END IF;

  -- Update profile
  UPDATE profiles
  SET 
    xp = new_xp,
    level = new_level,
    credits = credits + level_up_credits,
    updated_at = now()
  WHERE id = p_user_id;

  -- Record XP transaction
  INSERT INTO xp_transactions (user_id, amount, reason, task_id, review_id)
  VALUES (p_user_id, p_amount, p_reason, p_task_id, p_review_id);

  -- Record credit transaction if level up occurred
  IF level_up_credits > 0 THEN
    INSERT INTO credit_transactions (user_id, amount, transaction_type, reason)
    VALUES (p_user_id, level_up_credits, 'earned', 'Level up bonus');
  END IF;

  RETURN json_build_object(
    'success', true,
    'old_level', old_level,
    'new_level', new_level,
    'new_xp', new_xp,
    'credits_awarded', level_up_credits
  );
END;
$$;

-- Function to award credits
CREATE OR REPLACE FUNCTION award_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_task_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update profile credits
  UPDATE profiles
  SET 
    credits = credits + p_amount,
    updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  -- Record credit transaction
  INSERT INTO credit_transactions (user_id, amount, transaction_type, reason, task_id)
  VALUES (p_user_id, p_amount, 'earned', p_reason, p_task_id);

  RETURN json_build_object('success', true, 'credits_awarded', p_amount);
END;
$$;

-- Function to spend credits
CREATE OR REPLACE FUNCTION spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_task_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  current_credits integer;
BEGIN
  -- Check current credits
  SELECT credits INTO current_credits
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  IF current_credits < p_amount THEN
    RETURN json_build_object('error', 'Insufficient credits');
  END IF;

  -- Deduct credits
  UPDATE profiles
  SET 
    credits = credits - p_amount,
    updated_at = now()
  WHERE id = p_user_id;

  -- Record credit transaction
  INSERT INTO credit_transactions (user_id, amount, transaction_type, reason, task_id)
  VALUES (p_user_id, -p_amount, 'spent', p_reason, p_task_id);

  RETURN json_build_object('success', true, 'credits_spent', p_amount);
END;
$$;

-- Trigger to award XP when tasks are completed
CREATE OR REPLACE FUNCTION award_task_completion_xp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  task_xp integer;
  poster_xp integer;
BEGIN
  -- Only award XP when status changes to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Calculate XP based on reward amount (1 XP per $0.10)
    task_xp := GREATEST(10, NEW.reward_cents / 10);
    poster_xp := GREATEST(5, NEW.reward_cents / 20);

    -- Award XP to task doer
    IF NEW.accepted_by IS NOT NULL THEN
      PERFORM award_xp(
        NEW.accepted_by,
        task_xp,
        'Completed task: ' || NEW.title,
        NEW.id
      );
    END IF;

    -- Award XP to task poster
    PERFORM award_xp(
      NEW.created_by,
      poster_xp,
      'Task completed: ' || NEW.title,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for task completion XP
DROP TRIGGER IF EXISTS award_task_xp ON tasks;
CREATE TRIGGER award_task_xp
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION award_task_completion_xp();

-- Trigger to award XP for positive reviews
CREATE OR REPLACE FUNCTION award_review_xp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  review_xp integer;
BEGIN
  -- Award XP based on star rating (5 stars = 25 XP, 4 stars = 15 XP, etc.)
  review_xp := CASE
    WHEN NEW.stars = 5 THEN 25
    WHEN NEW.stars = 4 THEN 15
    WHEN NEW.stars = 3 THEN 5
    ELSE 0
  END;

  -- Award XP to the person being reviewed (ratee)
  IF review_xp > 0 THEN
    PERFORM award_xp(
      NEW.ratee_id,
      review_xp,
      'Received ' || NEW.stars || '-star review',
      NEW.task_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for review XP
DROP TRIGGER IF EXISTS award_review_xp ON task_reviews;
CREATE TRIGGER award_review_xp
  AFTER INSERT ON task_reviews
  FOR EACH ROW
  EXECUTE FUNCTION award_review_xp();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(xp DESC);