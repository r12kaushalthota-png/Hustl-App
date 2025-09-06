/*
  # Simplified Task Acceptance System

  1. Core Tables
    - `tasks` - Basic task information with acceptance tracking
    - `profiles` - Minimal user profiles for task creators/accepters

  2. Key Features
    - Task acceptance with unique code generation
    - Basic task status tracking (open, accepted, completed, cancelled)
    - User assignment when accepting tasks

  3. Security
    - Enable RLS on all tables
    - Policies for task acceptance and viewing
*/

-- Drop all unnecessary tables and enums
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_members CASCADE;
DROP TABLE IF EXISTS message_reads CASCADE;
DROP TABLE IF EXISTS task_status_history CASCADE;
DROP TABLE IF EXISTS task_reviews CASCADE;
DROP TABLE IF EXISTS user_rating_aggregates CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS xp_transactions CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS task_progress CASCADE;
DROP VIEW IF EXISTS conversations CASCADE;

-- Drop unnecessary enums
DROP TYPE IF EXISTS task_phase CASCADE;
DROP TYPE IF EXISTS task_moderation_status CASCADE;

-- Ensure task_status enum exists with basic values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('open', 'accepted', 'completed', 'cancelled');
  END IF;
END $$;

-- Recreate simplified tasks table
DROP TABLE IF EXISTS tasks CASCADE;
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'food',
  store text NOT NULL DEFAULT '',
  dropoff_address text NOT NULL DEFAULT '',
  dropoff_instructions text DEFAULT '',
  urgency text NOT NULL DEFAULT 'medium',
  reward_cents integer NOT NULL DEFAULT 0,
  estimated_minutes integer NOT NULL DEFAULT 30,
  status task_status NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL,
  accepted_by uuid NULL,
  accepted_at timestamptz NULL,
  user_accept_code uuid NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT tasks_estimated_minutes_positive CHECK (estimated_minutes > 0),
  CONSTRAINT tasks_reward_cents_non_negative CHECK (reward_cents >= 0),
  CONSTRAINT tasks_category_check CHECK (category IN ('food', 'grocery', 'coffee')),
  CONSTRAINT tasks_urgency_check CHECK (urgency IN ('low', 'medium', 'high'))
);

-- Recreate simplified profiles table
DROP TABLE IF EXISTS profiles CASCADE;
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  username text NULL,
  full_name text NULL,
  avatar_url text NULL,
  major text NULL,
  university text NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for tasks
CREATE POLICY "Anyone can view open tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (status = 'open' OR created_by = auth.uid() OR accepted_by = auth.uid());

CREATE POLICY "Users can create tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own tasks or accept open tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR (status = 'open' AND auth.uid() IS NOT NULL))
  WITH CHECK (created_by = auth.uid() OR accepted_by = auth.uid());

-- Basic RLS policies for profiles
CREATE POLICY "Anyone can view profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_created_by ON tasks (created_by);
CREATE INDEX idx_tasks_accepted_by ON tasks (accepted_by) WHERE accepted_by IS NOT NULL;
CREATE INDEX idx_tasks_user_accept_code ON tasks (user_accept_code) WHERE user_accept_code IS NOT NULL;
CREATE INDEX idx_tasks_created_at ON tasks (created_at DESC);

-- Foreign key constraints
ALTER TABLE tasks ADD CONSTRAINT tasks_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE tasks ADD CONSTRAINT tasks_accepted_by_fkey 
  FOREIGN KEY (accepted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Simplified accept_task function
CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid, p_user_id uuid)
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
  created_by uuid,
  accepted_by uuid,
  accepted_at timestamptz,
  user_accept_code uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_accept_code uuid;
BEGIN
  -- Generate unique accept code
  v_accept_code := gen_random_uuid();
  
  -- Lock and fetch the task
  SELECT * INTO v_task
  FROM tasks t
  WHERE t.id = p_task_id
  FOR UPDATE;
  
  -- Validate task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;
  
  -- Validate task is open
  IF v_task.status != 'open' THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
  END IF;
  
  -- Validate user is not the creator
  IF v_task.created_by = p_user_id THEN
    RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
  END IF;
  
  -- Update task with acceptance
  UPDATE tasks t
  SET 
    status = 'accepted',
    accepted_by = p_user_id,
    accepted_at = now(),
    user_accept_code = v_accept_code,
    updated_at = now()
  WHERE t.id = p_task_id;
  
  -- Return updated task
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
    t.created_by,
    t.accepted_by,
    t.accepted_at,
    t.user_accept_code,
    t.created_at,
    t.updated_at
  FROM tasks t
  WHERE t.id = p_task_id;
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();