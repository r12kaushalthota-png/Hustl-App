/*
  # Push Notifications System

  1. New Tables
    - `push_subscriptions`
      - `user_id` (uuid, foreign key to auth.users)
      - `device_id` (text, unique device identifier)
      - `expo_token` (text, Expo push token)
      - `platform` (text, ios/android)
      - `updated_at` (timestamp)
      - Primary key: (user_id, device_id)
    
    - `notification_preferences`
      - `user_id` (uuid, primary key, foreign key to auth.users)
      - `new_tasks` (boolean, default true)
      - `task_accepted` (boolean, default true)
      - `task_updates` (boolean, default true)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own push subscriptions and preferences

  3. Triggers
    - Task posted: trigger on INSERT to tasks
    - Task accepted: trigger on UPDATE when accepted_by changes from NULL to not NULL
    - Task status updated: trigger on UPDATE when status changes

  4. Functions
    - Helper functions to call Edge Function via HTTP
*/

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  user_id uuid NOT NULL,
  device_id text NOT NULL,
  expo_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY,
  new_tasks boolean DEFAULT true,
  task_accepted boolean DEFAULT true,
  task_updates boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_subscriptions
CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for notification_preferences
CREATE POLICY "Users can read own notification preferences"
  ON notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify own notification preferences"
  ON notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to call Edge Function via HTTP
CREATE OR REPLACE FUNCTION call_send_push(event_type text, task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get Supabase URL and service role key from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If environment variables are not set, use defaults (will be configured in production)
  IF supabase_url IS NULL THEN
    supabase_url := 'http://localhost:54321';
  END IF;
  
  IF service_role_key IS NULL THEN
    service_role_key := 'placeholder-service-role-key';
  END IF;

  -- Make HTTP request to Edge Function
  SELECT INTO request_id
    net.http_post(
      url := supabase_url || '/functions/v1/sendPush',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'type', event_type,
        'taskId', task_id
      )
    );
    
  -- Log the request (optional, for debugging)
  INSERT INTO net.http_request_queue (id, method, url, headers, body, timeout_milliseconds)
  VALUES (request_id, 'POST', supabase_url || '/functions/v1/sendPush', 
          jsonb_build_object('Content-Type', 'application/json'), 
          jsonb_build_object('type', event_type, 'taskId', task_id), 
          5000)
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main transaction
    RAISE WARNING 'Failed to call sendPush function: %', SQLERRM;
END;
$$;

-- Trigger function for task posted
CREATE OR REPLACE FUNCTION trg_task_posted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger for new tasks with status 'open'
  IF NEW.status = 'open' THEN
    PERFORM call_send_push('TASK_POSTED', NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for task accepted
CREATE OR REPLACE FUNCTION trg_task_accepted_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if accepted_by changed from NULL to not NULL
  IF OLD.accepted_by IS NULL AND NEW.accepted_by IS NOT NULL THEN
    PERFORM call_send_push('TASK_ACCEPTED', NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for task status updated
CREATE OR REPLACE FUNCTION trg_task_status_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if status changed
  IF OLD.status IS DISTINCT FROM NEW.status OR OLD.current_status IS DISTINCT FROM NEW.current_status THEN
    PERFORM call_send_push('TASK_UPDATED', NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS tasks_after_insert_notification ON tasks;
CREATE TRIGGER tasks_after_insert_notification
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trg_task_posted();

DROP TRIGGER IF EXISTS tasks_after_update_accepted_notification ON tasks;
CREATE TRIGGER tasks_after_update_accepted_notification
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trg_task_accepted_notification();

DROP TRIGGER IF EXISTS tasks_after_update_status_notification ON tasks;
CREATE TRIGGER tasks_after_update_status_notification
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trg_task_status_updated();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_platform ON push_subscriptions(platform);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Insert default notification preferences for existing users
INSERT INTO notification_preferences (user_id, new_tasks, task_accepted, task_updates)
SELECT id, true, true, true
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;