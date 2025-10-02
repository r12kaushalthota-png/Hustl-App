/*
  # Complete Chat and Task Status System
  
  1. New Tables
    - `profiles` - User profiles with avatar, name, major, university
    - `tasks` - Task listings with status tracking
    - `chat_rooms` - Chat rooms tied to tasks
    - `chat_members` - Membership and unread counts
    - `chat_messages` - Messages in chat rooms
    - `task_status_history` - Timeline of task status changes
  
  2. Key Features
    - Idempotent chat room creation per task
    - Real-time message delivery
    - Unread message tracking
    - Task status progression timeline
    - Role-based permissions (poster vs doer)
  
  3. Security
    - RLS enabled on all tables
    - Only task participants can access chat
    - Only task doer can update most statuses
    - Only task poster can cancel
  
  4. Functions
    - `ensure_room_for_task(task_id)` - Creates chat room idempotently
    - `mark_room_read(room_id)` - Marks all messages as read
    - `get_chat_inbox()` - Returns user's chat list with unread counts
    - `get_task_status_timeline(task_id)` - Returns status change history
    - `update_task_status(task_id, new_status)` - Updates task status with validation
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  major text,
  university text,
  bio text,
  is_verified boolean DEFAULT false,
  completed_tasks_count integer DEFAULT 0,
  response_rate numeric DEFAULT 0,
  xp integer DEFAULT 0,
  level integer DEFAULT 1,
  credits integer DEFAULT 0,
  stripe_account_id text,
  stripe_onboarding_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('food', 'grocery', 'coffee')),
  store text NOT NULL,
  dropoff_address text NOT NULL,
  dropoff_instructions text DEFAULT '',
  urgency text NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
  reward_cents integer NOT NULL CHECK (reward_cents > 0),
  estimated_minutes integer NOT NULL CHECK (estimated_minutes > 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'completed', 'cancelled')),
  current_status text DEFAULT 'open',
  created_by uuid NOT NULL REFERENCES profiles(id),
  accepted_by uuid REFERENCES profiles(id),
  accepted_at timestamptz,
  user_accept_code text,
  lat_pickup numeric NOT NULL,
  long_pickup numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id)
);

-- Create chat_members table
CREATE TABLE IF NOT EXISTS chat_members (
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  unread_count integer DEFAULT 0,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create task_status_history table
CREATE TABLE IF NOT EXISTS task_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('accepted', 'en_route', 'arrived', 'picked_up', 'delivered', 'completed', 'cancelled')),
  changed_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_accepted_by ON tasks(accepted_by);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_task_id ON chat_rooms(task_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_task_status_history_task_id ON task_status_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_status_history_created_at ON task_status_history(created_at);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_status_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Tasks policies
CREATE POLICY "Anyone can view open tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (status = 'open' OR created_by = auth.uid() OR accepted_by = auth.uid());

CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Task owners can update their tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR accepted_by = auth.uid())
  WITH CHECK (created_by = auth.uid() OR accepted_by = auth.uid());

-- Chat rooms policies
CREATE POLICY "Task participants can view chat rooms"
  ON chat_rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = chat_rooms.task_id
      AND (tasks.created_by = auth.uid() OR tasks.accepted_by = auth.uid())
    )
  );

-- Chat members policies
CREATE POLICY "Users can view their memberships"
  ON chat_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their unread counts"
  ON chat_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Chat messages policies
CREATE POLICY "Room members can view messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_messages.room_id
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Room members can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_messages.room_id
      AND chat_members.user_id = auth.uid()
    )
  );

-- Task status history policies
CREATE POLICY "Task participants can view status history"
  ON task_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_status_history.task_id
      AND (tasks.created_by = auth.uid() OR tasks.accepted_by = auth.uid())
    )
  );

CREATE POLICY "Task doer can update status"
  ON task_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    changed_by = auth.uid() AND
    (
      EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = task_status_history.task_id
        AND tasks.accepted_by = auth.uid()
      )
      OR (
        status = 'cancelled' AND
        EXISTS (
          SELECT 1 FROM tasks
          WHERE tasks.id = task_status_history.task_id
          AND tasks.created_by = auth.uid()
        )
      )
    )
  );

-- Function: Ensure chat room exists for task (idempotent)
CREATE OR REPLACE FUNCTION ensure_room_for_task(p_task_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_room_id uuid;
  v_task_row tasks%ROWTYPE;
  v_result json;
BEGIN
  SELECT * INTO v_task_row FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Task not found');
  END IF;

  IF v_task_row.accepted_by IS NULL THEN
    RETURN json_build_object('error', 'Task must be accepted first');
  END IF;

  IF v_task_row.created_by != auth.uid() AND v_task_row.accepted_by != auth.uid() THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;

  SELECT id INTO v_room_id FROM chat_rooms WHERE task_id = p_task_id;

  IF v_room_id IS NULL THEN
    INSERT INTO chat_rooms (task_id) VALUES (p_task_id) RETURNING id INTO v_room_id;
    
    INSERT INTO chat_members (room_id, user_id) VALUES (v_room_id, v_task_row.created_by);
    INSERT INTO chat_members (room_id, user_id) VALUES (v_room_id, v_task_row.accepted_by);
  END IF;

  SELECT json_build_object(
    'id', id,
    'task_id', task_id,
    'created_at', created_at,
    'last_message', last_message,
    'last_message_at', last_message_at
  ) INTO v_result FROM chat_rooms WHERE id = v_room_id;

  RETURN v_result;
END;
$$;

-- Function: Mark room as read
CREATE OR REPLACE FUNCTION mark_room_read(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE chat_members
  SET unread_count = 0
  WHERE room_id = p_room_id AND user_id = auth.uid();
END;
$$;

-- Function: Get chat inbox
CREATE OR REPLACE FUNCTION get_chat_inbox()
RETURNS TABLE (
  room_id uuid,
  task_id uuid,
  other_id uuid,
  other_name text,
  other_avatar_url text,
  other_major text,
  last_message text,
  last_message_at timestamptz,
  unread_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id as room_id,
    cr.task_id,
    CASE 
      WHEN t.created_by = auth.uid() THEN t.accepted_by
      ELSE t.created_by
    END as other_id,
    p.full_name as other_name,
    p.avatar_url as other_avatar_url,
    p.major as other_major,
    cr.last_message,
    cr.last_message_at,
    COALESCE(cm.unread_count, 0) as unread_count
  FROM chat_rooms cr
  JOIN tasks t ON t.id = cr.task_id
  JOIN chat_members cm ON cm.room_id = cr.id AND cm.user_id = auth.uid()
  LEFT JOIN profiles p ON p.id = CASE 
    WHEN t.created_by = auth.uid() THEN t.accepted_by
    ELSE t.created_by
  END
  WHERE t.created_by = auth.uid() OR t.accepted_by = auth.uid()
  ORDER BY cr.last_message_at DESC NULLS LAST;
END;
$$;

-- Function: Get task status timeline
CREATE OR REPLACE FUNCTION get_task_status_timeline(p_task_id uuid)
RETURNS TABLE (
  status text,
  changed_by uuid,
  changed_by_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tsh.status,
    tsh.changed_by,
    p.full_name as changed_by_name,
    tsh.created_at
  FROM task_status_history tsh
  JOIN profiles p ON p.id = tsh.changed_by
  WHERE tsh.task_id = p_task_id
  ORDER BY tsh.created_at ASC;
END;
$$;

-- Function: Update task status
CREATE OR REPLACE FUNCTION update_task_status(p_task_id uuid, p_new_status text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_task_row tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_task_row FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Task not found');
  END IF;

  IF p_new_status = 'cancelled' AND v_task_row.created_by != auth.uid() THEN
    RETURN json_build_object('error', 'Only task poster can cancel');
  END IF;

  IF p_new_status != 'cancelled' AND v_task_row.accepted_by != auth.uid() THEN
    RETURN json_build_object('error', 'Only task doer can update status');
  END IF;

  UPDATE tasks SET current_status = p_new_status, updated_at = now() WHERE id = p_task_id;
  
  INSERT INTO task_status_history (task_id, status, changed_by)
  VALUES (p_task_id, p_new_status, auth.uid());

  RETURN json_build_object('success', true);
END;
$$;

-- Trigger: Update unread counts on new message
CREATE OR REPLACE FUNCTION increment_unread_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE chat_members
  SET unread_count = unread_count + 1
  WHERE room_id = NEW.room_id AND user_id != NEW.sender_id;

  UPDATE chat_rooms
  SET last_message = NEW.text, last_message_at = NEW.created_at
  WHERE id = NEW.room_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_increment_unread_counts
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_unread_counts();

-- Trigger: Update task status on history insert
CREATE OR REPLACE FUNCTION update_task_current_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE tasks
  SET current_status = NEW.status, updated_at = now()
  WHERE id = NEW.task_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_task_current_status
  AFTER INSERT ON task_status_history
  FOR EACH ROW
  EXECUTE FUNCTION update_task_current_status();

-- Trigger: Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON chat_rooms TO authenticated;
GRANT ALL ON chat_members TO authenticated;
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON task_status_history TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_room_for_task TO authenticated;
GRANT EXECUTE ON FUNCTION mark_room_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_inbox TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_status_timeline TO authenticated;
GRANT EXECUTE ON FUNCTION update_task_status TO authenticated;