/*
  # Fix Task Acceptance System

  1. Functions
    - Drop and recreate accept_task function with proper column qualification
    - Drop and recreate ensure_room_for_task function
    - Drop and recreate get_chat_inbox function
    - Drop and recreate mark_room_read function

  2. Security
    - All functions use proper RLS and security checks
    - Atomic task acceptance prevents race conditions

  3. Changes
    - Fixed all ambiguous column references by properly qualifying table aliases
    - Uses existing schema columns (created_by, not owner_id)
    - Returns proper data structure for frontend
*/

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.accept_task(uuid);
DROP FUNCTION IF EXISTS public.accept_task(p_task_id uuid);
DROP FUNCTION IF EXISTS public.ensure_room_for_task(uuid);
DROP FUNCTION IF EXISTS public.ensure_room_for_task(p_task_id uuid);
DROP FUNCTION IF EXISTS public.get_chat_inbox();
DROP FUNCTION IF EXISTS public.mark_room_read(uuid);
DROP FUNCTION IF EXISTS public.mark_room_read(p_room_id uuid);

-- Function to generate unique 5-digit acceptance code
CREATE OR REPLACE FUNCTION public.generate_acceptance_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    code_digits integer[] := ARRAY[0,1,2,3,4,5,6,7,8,9];
    result_code text := '';
    i integer;
    j integer;
    temp integer;
    selected_digit integer;
BEGIN
    -- Fisher-Yates shuffle for unique digits
    FOR i IN 10 DOWNTO 2 LOOP
        j := floor(random() * i)::integer + 1;
        temp := code_digits[i];
        code_digits[i] := code_digits[j];
        code_digits[j] := temp;
    END LOOP;
    
    -- Take first 5 digits
    FOR i IN 1..5 LOOP
        result_code := result_code || code_digits[i]::text;
    END LOOP;
    
    RETURN result_code;
END;
$$;

-- Main task acceptance function
CREATE OR REPLACE FUNCTION public.accept_task(p_task_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    task_record record;
    acceptance_code text;
    room_record record;
    result json;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Lock and get task with proper column qualification
    SELECT 
        t.id,
        t.title,
        t.category,
        t.created_by,
        t.accepted_by,
        t.status,
        t.created_at,
        t.updated_at
    INTO task_record
    FROM public.tasks t
    WHERE t.id = p_task_id
    FOR UPDATE;

    -- Validate task exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    -- Validate task is available
    IF task_record.status != 'open' THEN
        RAISE EXCEPTION 'Task is not available for acceptance';
    END IF;

    -- Prevent self-acceptance
    IF task_record.created_by = current_user_id THEN
        RAISE EXCEPTION 'Cannot accept your own task';
    END IF;

    -- Generate unique acceptance code
    acceptance_code := public.generate_acceptance_code();

    -- Accept the task atomically
    UPDATE public.tasks 
    SET 
        status = 'accepted',
        accepted_by = current_user_id,
        accepted_at = now(),
        user_accept_code = acceptance_code::uuid,
        updated_at = now()
    WHERE id = p_task_id;

    -- Ensure chat room exists
    INSERT INTO public.chat_rooms (task_id, created_at)
    VALUES (p_task_id, now())
    ON CONFLICT (task_id) DO NOTHING;

    -- Get the room
    SELECT cr.id, cr.task_id, cr.created_at
    INTO room_record
    FROM public.chat_rooms cr
    WHERE cr.task_id = p_task_id;

    -- Add both users as chat members
    INSERT INTO public.chat_members (room_id, user_id, unread_count, last_read_at)
    VALUES 
        (room_record.id, task_record.created_by, 0, now()),
        (room_record.id, current_user_id, 0, now())
    ON CONFLICT (room_id, user_id) DO NOTHING;

    -- Post system message with acceptance code
    INSERT INTO public.chat_messages (room_id, sender_id, text, created_at)
    VALUES (
        room_record.id,
        current_user_id,
        'Task accepted! Acceptance code: ' || acceptance_code,
        now()
    );

    -- Build result
    result := json_build_object(
        'task_id', task_record.id,
        'status', 'accepted',
        'acceptance_code', acceptance_code,
        'chat_id', room_record.id,
        'task_category', task_record.category,
        'accepted_by', current_user_id,
        'owner_id', task_record.created_by,
        'accepted_at', now()
    );

    RETURN result;
END;
$$;

-- Function to ensure chat room exists for a task
CREATE OR REPLACE FUNCTION public.ensure_room_for_task(p_task_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_record record;
    task_owner_id uuid;
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Get task owner
    SELECT t.created_by INTO task_owner_id
    FROM public.tasks t
    WHERE t.id = p_task_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    -- Create room if it doesn't exist
    INSERT INTO public.chat_rooms (task_id, created_at)
    VALUES (p_task_id, now())
    ON CONFLICT (task_id) DO NOTHING;

    -- Get the room
    SELECT cr.id, cr.task_id, cr.created_at, cr.last_message, cr.last_message_at
    INTO room_record
    FROM public.chat_rooms cr
    WHERE cr.task_id = p_task_id;

    -- Ensure both users are members
    INSERT INTO public.chat_members (room_id, user_id, unread_count, last_read_at)
    VALUES 
        (room_record.id, task_owner_id, 0, now()),
        (room_record.id, current_user_id, 0, now())
    ON CONFLICT (room_id, user_id) DO NOTHING;

    RETURN json_build_object(
        'id', room_record.id,
        'task_id', room_record.task_id,
        'created_at', room_record.created_at,
        'last_message', room_record.last_message,
        'last_message_at', room_record.last_message_at
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
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
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
    INNER JOIN public.chat_members my_member ON my_member.room_id = cr.id AND my_member.user_id = current_user_id
    INNER JOIN public.chat_members other_member ON other_member.room_id = cr.id AND other_member.user_id != current_user_id
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
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Update member's unread count and last read time
    UPDATE public.chat_members 
    SET 
        unread_count = 0,
        last_read_at = now()
    WHERE room_id = p_room_id AND user_id = current_user_id;
END;
$$;