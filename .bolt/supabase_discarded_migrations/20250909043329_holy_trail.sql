/*
  # Complete Accept Task System

  1. Database Functions
    - `accept_task(task_id uuid)` - Atomic task acceptance with unique code generation
    - `ensure_room_for_task(p_task_id uuid)` - Create or get chat room for task
    - `get_chat_inbox()` - Get user's chat conversations
    - `mark_room_read(p_room_id uuid)` - Mark chat room as read

  2. Schema Updates
    - Add `user_accept_code` column to tasks table for 5-digit codes
    - Ensure all chat tables exist with proper RLS

  3. Security
    - Enable RLS on all chat tables
    - Add policies for authenticated users to manage their own data
    - Proper grants for PostgREST access

  4. User Experience
    - Atomic task acceptance prevents race conditions
    - Unique 5-digit codes with no repeated digits
    - Automatic chat creation between task owner and accepter
    - System message with acceptance code
    - Returns complete data for UI: task_id, status, acceptance_code, chat_id, task_category, accepted_by, owner_id, accepted_at
*/

-- Drop all problematic triggers and functions first
DROP TRIGGER IF EXISTS award_task_xp ON public.tasks;
DROP TRIGGER IF EXISTS tasks_after_insert_notification ON public.tasks;
DROP TRIGGER IF EXISTS tasks_after_update_accepted_notification ON public.tasks;
DROP TRIGGER IF EXISTS tasks_after_update_chat ON public.tasks;
DROP TRIGGER IF EXISTS tasks_after_update_status_notification ON public.tasks;
DROP TRIGGER IF EXISTS trg_task_accepted_notifications ON public.tasks;
DROP TRIGGER IF EXISTS trg_task_posted_notifications ON public.tasks;
DROP TRIGGER IF EXISTS trg_task_updated_notifications ON public.tasks;

DROP FUNCTION IF EXISTS public.award_task_completion_xp() CASCADE;
DROP FUNCTION IF EXISTS public.trg_task_posted() CASCADE;
DROP FUNCTION IF EXISTS public.trg_task_accepted_notification() CASCADE;
DROP FUNCTION IF EXISTS public.trg_task_accepted() CASCADE;
DROP FUNCTION IF EXISTS public.trg_task_status_updated() CASCADE;
DROP FUNCTION IF EXISTS public.notify_task_posted() CASCADE;
DROP FUNCTION IF EXISTS public.notify_task_accepted() CASCADE;
DROP FUNCTION IF EXISTS public.notify_task_updated() CASCADE;

-- Add user_accept_code column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'user_accept_code'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN user_accept_code uuid;
    CREATE INDEX IF NOT EXISTS idx_tasks_user_accept_code ON public.tasks(user_accept_code) WHERE user_accept_code IS NOT NULL;
  END IF;
END $$;

-- Ensure chat tables exist with proper structure
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message text,
  last_message_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS chat_rooms_task_id_key ON public.chat_rooms(task_id);

CREATE TABLE IF NOT EXISTS public.chat_members (
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  unread_count integer NOT NULL DEFAULT 0,
  last_read_at timestamptz,
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_user ON public.chat_members(user_id);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  text text NOT NULL CHECK (length(trim(text)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_time ON public.chat_messages(room_id, created_at DESC);

-- Enable RLS on all chat tables
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_rooms
DROP POLICY IF EXISTS "chat_rooms_select_for_members" ON public.chat_rooms;
CREATE POLICY "chat_rooms_select_for_members" ON public.chat_rooms
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_members.room_id = chat_rooms.id
    AND chat_members.user_id = auth.uid()
  ));

-- RLS Policies for chat_members
DROP POLICY IF EXISTS "chat_members_select_own" ON public.chat_members;
CREATE POLICY "chat_members_select_own" ON public.chat_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "chat_members_update_own" ON public.chat_members;
CREATE POLICY "chat_members_update_own" ON public.chat_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for chat_messages
DROP POLICY IF EXISTS "chat_messages_select_for_members" ON public.chat_messages;
CREATE POLICY "chat_messages_select_for_members" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_members.room_id = chat_messages.room_id
    AND chat_members.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "chat_messages_insert_for_members" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_for_members" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.room_id = chat_messages.room_id
      AND chat_members.user_id = auth.uid()
    )
  );

-- Function to generate unique 5-digit code with no repeated digits
CREATE OR REPLACE FUNCTION public.generate_unique_accept_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code_digits integer[] := ARRAY[0,1,2,3,4,5,6,7,8,9];
  selected_digits integer[] := '{}';
  i integer;
  j integer;
  temp integer;
  result_code text := '';
BEGIN
  -- Fisher-Yates shuffle to get 5 unique digits
  FOR i IN 1..5 LOOP
    -- Pick random index from remaining digits
    j := floor(random() * (11 - i))::integer + 1;
    
    -- Add selected digit to result
    selected_digits := selected_digits || code_digits[j];
    
    -- Remove selected digit by swapping with last and reducing array
    code_digits[j] := code_digits[11 - i];
  END LOOP;
  
  -- Convert digits to string
  FOR i IN 1..5 LOOP
    result_code := result_code || selected_digits[i]::text;
  END LOOP;
  
  RETURN result_code;
END;
$$;

-- Function to ensure chat room exists for a task
CREATE OR REPLACE FUNCTION public.ensure_room_for_task(p_task_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  room_id uuid;
  task_owner_id uuid;
  task_accepter_id uuid;
BEGIN
  -- Get existing room
  SELECT id INTO room_id
  FROM public.chat_rooms
  WHERE task_id = p_task_id;
  
  IF room_id IS NOT NULL THEN
    RETURN room_id;
  END IF;
  
  -- Get task participants
  SELECT created_by, accepted_by INTO task_owner_id, task_accepter_id
  FROM public.tasks
  WHERE id = p_task_id AND status = 'accepted';
  
  IF task_owner_id IS NULL OR task_accepter_id IS NULL THEN
    RAISE EXCEPTION 'Task not found or not accepted';
  END IF;
  
  -- Create new room
  INSERT INTO public.chat_rooms (task_id, created_at)
  VALUES (p_task_id, now())
  RETURNING id INTO room_id;
  
  -- Add both participants as members
  INSERT INTO public.chat_members (room_id, user_id, unread_count, last_read_at)
  VALUES 
    (room_id, task_owner_id, 0, now()),
    (room_id, task_accepter_id, 0, now());
  
  RETURN room_id;
END;
$$;

-- Main accept_task function with complete user experience
CREATE OR REPLACE FUNCTION public.accept_task(task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record record;
  accept_code text;
  room_id uuid;
  current_user_id uuid := auth.uid();
BEGIN
  -- Validate user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Lock and validate task atomically
  SELECT 
    t.id,
    t.title,
    t.status,
    t.created_by,
    t.accepted_by,
    t.category,
    t.user_accept_code
  INTO task_record
  FROM public.tasks t
  WHERE t.id = accept_task.task_id
  FOR UPDATE;
  
  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  
  -- Check if user can accept this task
  IF task_record.created_by = current_user_id THEN
    RAISE EXCEPTION 'Cannot accept your own task';
  END IF;
  
  -- If already accepted, return existing data
  IF task_record.status = 'accepted' THEN
    IF task_record.accepted_by = current_user_id THEN
      -- User already accepted this task, return existing data
      SELECT id INTO room_id FROM public.chat_rooms WHERE task_id = accept_task.task_id;
      
      RETURN jsonb_build_object(
        'task_id', task_record.id,
        'status', task_record.status,
        'acceptance_code', task_record.user_accept_code,
        'chat_id', room_id,
        'task_category', task_record.category,
        'accepted_by', current_user_id,
        'owner_id', task_record.created_by,
        'accepted_at', now()
      );
    ELSE
      RAISE EXCEPTION 'Task has already been accepted by someone else';
    END IF;
  END IF;
  
  -- Check if task is available for acceptance
  IF task_record.status != 'open' THEN
    RAISE EXCEPTION 'Task is not available for acceptance';
  END IF;
  
  -- Generate unique acceptance code
  accept_code := public.generate_unique_accept_code();
  
  -- Accept the task atomically
  UPDATE public.tasks
  SET 
    status = 'accepted',
    accepted_by = current_user_id,
    accepted_at = now(),
    user_accept_code = accept_code::uuid,
    updated_at = now()
  WHERE id = accept_task.task_id;
  
  -- Create or get chat room
  room_id := public.ensure_room_for_task(accept_task.task_id);
  
  -- Post system message with acceptance code
  INSERT INTO public.chat_messages (room_id, sender_id, text, created_at)
  VALUES (
    room_id,
    current_user_id,
    'Task accepted! Acceptance code: ' || accept_code,
    now()
  );
  
  -- Return complete data for UI
  RETURN jsonb_build_object(
    'task_id', task_record.id,
    'status', 'accepted',
    'acceptance_code', accept_code,
    'chat_id', room_id,
    'task_category', task_record.category,
    'accepted_by', current_user_id,
    'owner_id', task_record.created_by,
    'accepted_at', now()
  );
END;
$$;

-- Function to get user's chat inbox
CREATE OR REPLACE FUNCTION public.get_chat_inbox()
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
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  RETURN QUERY
  SELECT 
    cr.id as room_id,
    cr.task_id,
    other_member.user_id as other_id,
    COALESCE(other_profile.full_name, other_profile.username, 'User') as other_name,
    other_profile.avatar_url as other_avatar_url,
    other_profile.major as other_major,
    cr.last_message,
    cr.last_message_at,
    COALESCE(my_member.unread_count, 0) as unread_count
  FROM public.chat_rooms cr
  JOIN public.chat_members my_member ON my_member.room_id = cr.id AND my_member.user_id = current_user_id
  JOIN public.chat_members other_member ON other_member.room_id = cr.id AND other_member.user_id != current_user_id
  LEFT JOIN public.profiles other_profile ON other_profile.id = other_member.user_id
  ORDER BY cr.last_message_at DESC NULLS LAST;
END;
$$;

-- Function to mark room as read
CREATE OR REPLACE FUNCTION public.mark_room_read(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Update member's read status
  UPDATE public.chat_members
  SET 
    unread_count = 0,
    last_read_at = now()
  WHERE room_id = p_room_id AND user_id = current_user_id;
END;
$$;

-- Trigger to update chat room last message
CREATE OR REPLACE FUNCTION public.trg_after_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update room's last message info
  UPDATE public.chat_rooms
  SET 
    last_message = NEW.text,
    last_message_at = NEW.created_at
  WHERE id = NEW.room_id;
  
  -- Increment unread count for other members
  UPDATE public.chat_members
  SET unread_count = unread_count + 1
  WHERE room_id = NEW.room_id AND user_id != NEW.sender_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to mark sender as having read their own message
CREATE OR REPLACE FUNCTION public.trg_message_sender_seen()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mark sender as having read up to this message
  UPDATE public.chat_members
  SET last_read_at = NEW.created_at
  WHERE room_id = NEW.room_id AND user_id = NEW.sender_id;
  
  RETURN NEW;
END;
$$;

-- Apply triggers
DROP TRIGGER IF EXISTS chat_messages_after_insert ON public.chat_messages;
CREATE TRIGGER chat_messages_after_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_after_message();

DROP TRIGGER IF EXISTS chat_messages_after_insert_seen ON public.chat_messages;
CREATE TRIGGER chat_messages_after_insert_seen
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_message_sender_seen();

-- Grant necessary permissions for PostgREST
GRANT EXECUTE ON FUNCTION public.accept_task(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_room_for_task(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_inbox() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_room_read(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_unique_accept_code() TO anon, authenticated;

-- Refresh schema cache for PostgREST
NOTIFY pgrst, 'reload schema';