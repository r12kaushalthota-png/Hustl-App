/*
  # In-App Notifications System

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `type` (text, enum: TASK_POSTED, TASK_ACCEPTED, TASK_UPDATED)
      - `title` (text, notification title)
      - `body` (text, notification body)
      - `task_id` (uuid, optional reference to task)
      - `meta` (jsonb, optional metadata)
      - `is_read` (boolean, default false)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `notifications` table
    - Users can only read/update their own notifications
    - Only service role can insert notifications

  3. Functions
    - `create_notification` - Creates notifications for users
    - `mark_notification_read` - Marks single notification as read
    - `mark_all_notifications_read` - Marks all user notifications as read
    - `get_unread_count` - Gets unread notification count for user

  4. Triggers
    - Task posted → notify eligible users
    - Task accepted → notify task owner
    - Task status updated → notify owner and doer
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('TASK_POSTED', 'TASK_ACCEPTED', 'TASK_UPDATED')),
  title text NOT NULL,
  body text NOT NULL,
  task_id uuid,
  meta jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_task_id uuid DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id uuid;
BEGIN
  -- Validate type
  IF p_type NOT IN ('TASK_POSTED', 'TASK_ACCEPTED', 'TASK_UPDATED') THEN
    RAISE EXCEPTION 'Invalid notification type: %', p_type;
  END IF;

  -- Insert notification
  INSERT INTO notifications (user_id, type, title, body, task_id, meta)
  VALUES (p_user_id, p_type, p_title, p_body, p_task_id, p_meta)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE id = p_notification_id
    AND user_id = auth.uid()
    AND is_read = false;

  RETURN FOUND;
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE user_id = auth.uid()
    AND is_read = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Function to get unread count
CREATE OR REPLACE FUNCTION get_unread_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_result integer;
BEGIN
  SELECT COUNT(*)
  INTO count_result
  FROM notifications
  WHERE user_id = auth.uid()
    AND is_read = false;

  RETURN COALESCE(count_result, 0);
END;
$$;

-- Function to handle task posted notifications
CREATE OR REPLACE FUNCTION notify_task_posted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For now, notify a test audience (exclude task owner)
  -- In production, this could be geo-filtered or subscription-based
  INSERT INTO notifications (user_id, type, title, body, task_id, meta)
  SELECT 
    p.id,
    'TASK_POSTED',
    'New task near you',
    NEW.title || ' • ' || NEW.store,
    NEW.id,
    jsonb_build_object('category', NEW.category, 'urgency', NEW.urgency)
  FROM profiles p
  WHERE p.id != NEW.created_by
    AND p.id IN (
      -- For demo: notify first 10 users who aren't the creator
      SELECT id FROM profiles 
      WHERE id != NEW.created_by 
      ORDER BY created_at 
      LIMIT 10
    );

  RETURN NEW;
END;
$$;

-- Function to handle task accepted notifications
CREATE OR REPLACE FUNCTION notify_task_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify when accepted_by changes from null to a value
  IF OLD.accepted_by IS NULL AND NEW.accepted_by IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, task_id, meta)
    VALUES (
      NEW.created_by,
      'TASK_ACCEPTED',
      'Your task was accepted!',
      'Someone picked up your task: ' || NEW.title,
      NEW.id,
      jsonb_build_object('accepted_by', NEW.accepted_by)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Function to handle task status update notifications
CREATE OR REPLACE FUNCTION notify_task_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  status_text text;
BEGIN
  -- Only notify when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status OR OLD.current_status IS DISTINCT FROM NEW.current_status THEN
    -- Format status for display
    status_text := COALESCE(
      CASE NEW.current_status
        WHEN 'accepted' THEN 'Accepted'
        WHEN 'picked_up' THEN 'Picked Up'
        WHEN 'on_the_way' THEN 'On the Way'
        WHEN 'delivered' THEN 'Delivered'
        WHEN 'completed' THEN 'Completed'
        ELSE NEW.current_status
      END,
      CASE NEW.status
        WHEN 'open' THEN 'Open'
        WHEN 'accepted' THEN 'Accepted'
        WHEN 'completed' THEN 'Completed'
        WHEN 'cancelled' THEN 'Cancelled'
        ELSE NEW.status
      END
    );

    -- Notify task owner
    INSERT INTO notifications (user_id, type, title, body, task_id, meta)
    VALUES (
      NEW.created_by,
      'TASK_UPDATED',
      'Task update',
      NEW.title || ' • ' || status_text,
      NEW.id,
      jsonb_build_object('status', NEW.status, 'current_status', NEW.current_status)
    );

    -- Notify accepted doer (if different from owner)
    IF NEW.accepted_by IS NOT NULL AND NEW.accepted_by != NEW.created_by THEN
      INSERT INTO notifications (user_id, type, title, body, task_id, meta)
      VALUES (
        NEW.accepted_by,
        'TASK_UPDATED',
        'Task update',
        NEW.title || ' • ' || status_text,
        NEW.id,
        jsonb_build_object('status', NEW.status, 'current_status', NEW.current_status)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trg_task_posted_notifications ON tasks;
CREATE TRIGGER trg_task_posted_notifications
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_posted();

DROP TRIGGER IF EXISTS trg_task_accepted_notifications ON tasks;
CREATE TRIGGER trg_task_accepted_notifications
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_accepted();

DROP TRIGGER IF EXISTS trg_task_updated_notifications ON tasks;
CREATE TRIGGER trg_task_updated_notifications
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_updated();