/*
  # Add accept_task RPC function

  1. New Function
    - `accept_task(task_id uuid)` - Atomically accepts a task and returns acceptance data
    - Generates unique acceptance code
    - Creates chat room and adds members
    - Returns structured result with all necessary data

  2. Return Type
    - Custom composite type for structured return data
    - Includes task_id, status, acceptance_code, chat_id, task_category, etc.

  3. Security
    - Requires authentication
    - Prevents self-acceptance
    - Uses advisory locks to prevent race conditions
    - Validates task availability
*/

-- Create the composite type for the function's return value
CREATE TYPE IF NOT EXISTS public.accepted_task_result AS (
    task_id uuid,
    status text,
    acceptance_code text,
    chat_id uuid,
    task_category text,
    accepted_by uuid,
    owner_id uuid,
    accepted_at timestamp with time zone
);

-- Create or replace the RPC function
CREATE OR REPLACE FUNCTION public.accept_task(task_id uuid)
RETURNS public.accepted_task_result
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _accepted_by uuid := auth.uid();
    _acceptance_code text;
    _chat_room_id uuid;
    _task_record RECORD;
    _result public.accepted_task_result;
BEGIN
    -- Check if user is authenticated
    IF _accepted_by IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Acquire a lock on the task to prevent race conditions
    PERFORM pg_advisory_xact_lock(hashtext(task_id::text));

    -- Fetch task details and check status
    SELECT
        id,
        status,
        created_by,
        category
    INTO
        _task_record
    FROM
        public.tasks
    WHERE
        id = task_id;

    -- Check if task exists
    IF _task_record.id IS NULL THEN
        RAISE EXCEPTION 'Task not found or no longer available';
    END IF;

    -- Check if task is open
    IF _task_record.status <> 'open' THEN
        RAISE EXCEPTION 'Task is no longer open or has already been accepted';
    END IF;

    -- Check if user is trying to accept their own task
    IF _task_record.created_by = _accepted_by THEN
        RAISE EXCEPTION 'You cannot accept your own task';
    END IF;

    -- Generate a unique 5-digit acceptance code with no repeated digits
    _acceptance_code := (
        SELECT string_agg(digit::text, '' ORDER BY random())
        FROM (
            SELECT generate_series(0, 9) AS digit
        ) t
        LIMIT 5
    );

    -- Update task status and accepted_by
    UPDATE
        public.tasks
    SET
        status = 'accepted',
        accepted_by = _accepted_by,
        user_accept_code = _acceptance_code,
        accepted_at = now(),
        updated_at = now()
    WHERE
        id = task_id
    RETURNING
        id, status, user_accept_code, accepted_by, created_by, accepted_at
    INTO
        _result.task_id, _result.status, _result.acceptance_code, _result.accepted_by, _result.owner_id, _result.accepted_at;

    -- Ensure a chat room exists for the task
    INSERT INTO public.chat_rooms (task_id)
    VALUES (task_id)
    ON CONFLICT (task_id) DO NOTHING;

    -- Get the chat room ID (either newly created or existing)
    SELECT id INTO _chat_room_id FROM public.chat_rooms WHERE task_id = task_id;

    -- Insert chat members (task owner and accepted_by user) if they don't exist
    INSERT INTO public.chat_members (room_id, user_id)
    VALUES
        (_chat_room_id, _task_record.created_by),
        (_chat_room_id, _accepted_by)
    ON CONFLICT (room_id, user_id) DO NOTHING;

    _result.chat_id := _chat_room_id;
    _result.task_category := _task_record.category;

    RETURN _result;
END;
$$;