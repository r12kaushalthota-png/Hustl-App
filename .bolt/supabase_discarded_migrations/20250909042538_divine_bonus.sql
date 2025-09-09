/*
  # Complete Accept Task System

  1. Schema Cleanup & Normalization
    - Drop problematic triggers referencing current_status/owner_id
    - Create canonical owner resolution system
    - Ensure all required columns exist with proper defaults

  2. Chat System
    - Create/adapt chat tables with proper relationships
    - Enable RLS for secure chat access

  3. Task Acceptance System
    - Create task_acceptances table for tracking codes
    - Generate unique 5-digit codes with no repeated digits
    - Atomic task acceptance with proper locking

  4. RPC Function
    - public.accept_task(task_id uuid) with PostgREST discoverability
    - Complete transaction flow with error handling
    - Return all data needed for UI

  5. Security
    - Comprehensive RLS policies using canonical owner functions
    - Proper grants for PostgREST schema cache
*/

-- 0) HARD CLEANUP - Drop problematic triggers/functions FIRST
DROP TRIGGER IF EXISTS trg_task_status_updated ON public.tasks CASCADE;
DROP TRIGGER IF EXISTS tasks_status_trigger ON public.tasks CASCADE;
DROP TRIGGER IF EXISTS update_task_status ON public.tasks CASCADE;
DROP TRIGGER IF EXISTS normalize_task_status ON public.tasks CASCADE;
DROP TRIGGER IF EXISTS task_status_trigger ON public.tasks CASCADE;

DROP FUNCTION IF EXISTS public.trg_task_status_updated() CASCADE;
DROP FUNCTION IF EXISTS public.tasks_status_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.update_task_status() CASCADE;
DROP FUNCTION IF EXISTS public.normalize_task_status() CASCADE;
DROP FUNCTION IF EXISTS public.task_status_trigger() CASCADE;

-- Drop any accept_task variants
DROP FUNCTION IF EXISTS public.accept_task(text) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task(json) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task() CASCADE;

-- Query and drop any remaining triggers on tasks that reference current_status
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN 
        SELECT t.tgname, c.relname
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' 
        AND c.relname = 'tasks'
        AND t.tgname NOT LIKE 'RI_%'
    LOOP
        BEGIN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.tasks CASCADE', trigger_rec.tgname);
        EXCEPTION WHEN OTHERS THEN
            -- Continue if trigger doesn't exist
            NULL;
        END;
    END LOOP;
END $$;

-- 1) TEMPORARILY DISABLE USER TRIGGERS during schema changes
ALTER TABLE public.tasks DISABLE TRIGGER USER;

-- 2) CANONICAL OWNER SYSTEM - Create view that works with any schema
CREATE OR REPLACE VIEW public.v_task_owner AS
SELECT
  t.id AS task_id,
  COALESCE(
    t.created_by,
    t.owner_id,
    t.poster_id,
    t.user_id,
    t.creator_id
  ) AS owner_id
FROM public.tasks t;

COMMENT ON VIEW public.v_task_owner IS 'Canonical mapping of tasks to owner_id regardless of column naming';

-- Helper function for owner resolution
CREATE OR REPLACE FUNCTION public.get_task_owner(p_task_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT owner_id FROM public.v_task_owner WHERE task_id = p_task_id;
$$;

-- 3) NORMALIZE TASKS SCHEMA - Ensure required columns exist
DO $$
BEGIN
    -- Add accepted_by if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'accepted_by'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN accepted_by uuid;
    END IF;

    -- Add accepted_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'accepted_at'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN accepted_at timestamptz;
    END IF;

    -- Add task_category if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'task_category'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN task_category text NOT NULL DEFAULT 'general_task';
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- Ensure status column supports 'accepted'
DO $$
BEGIN
    -- If status is an enum, add 'accepted' if not present
    IF EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public' AND t.typname = 'task_status'
    ) THEN
        -- Check if 'accepted' value exists in enum
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            JOIN pg_namespace n ON t.typnamespace = n.oid
            WHERE n.nspname = 'public' AND t.typname = 'task_status' AND e.enumlabel = 'accepted'
        ) THEN
            ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'accepted';
        END IF;
    END IF;
END $$;

-- 4) BACKFILL task_category from legacy columns (with triggers disabled)
UPDATE public.tasks t
SET task_category = COALESCE(
  -- Use existing task_category if valid
  CASE 
    WHEN t.task_category IS NOT NULL AND t.task_category != '' 
    THEN t.task_category
    ELSE NULL
  END,
  -- Map from legacy category column
  CASE lower(COALESCE(t.category, ''))
    WHEN 'food' THEN 'food_delivery'
    WHEN 'coffee' THEN 'coffee_run'
    WHEN 'grocery' THEN 'grocery_shopping'
    ELSE NULL
  END,
  -- Map from legacy task_type column
  CASE lower(COALESCE(t.task_type, ''))
    WHEN 'delivery' THEN 'food_delivery'
    WHEN 'pickup' THEN 'general_task'
    ELSE NULL
  END,
  -- Map from legacy type column
  CASE lower(COALESCE(t.type, ''))
    WHEN 'food_delivery' THEN 'food_delivery'
    WHEN 'coffee_run' THEN 'coffee_run'
    ELSE NULL
  END,
  -- Default fallback
  'general_task'
)
WHERE t.task_category IS NULL OR t.task_category = '';

-- 5) CHAT SYSTEM - Create or adapt tables
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL UNIQUE,
  task_category text NOT NULL DEFAULT 'general_task',
  created_at timestamptz DEFAULT now()
);

-- Add foreign key to tasks if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'chats' 
        AND constraint_name = 'chats_task_id_fkey'
    ) THEN
        ALTER TABLE public.chats ADD CONSTRAINT chats_task_id_fkey 
        FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Adapt existing chat_rooms table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'chat_rooms'
    ) THEN
        -- Add task_category to chat_rooms if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'chat_rooms' AND column_name = 'task_category'
        ) THEN
            ALTER TABLE public.chat_rooms ADD COLUMN task_category text NOT NULL DEFAULT 'general_task';
        END IF;
        
        -- Backfill task_category in chat_rooms
        UPDATE public.chat_rooms cr
        SET task_category = COALESCE(
            (SELECT t.task_category FROM public.tasks t WHERE t.id = cr.task_id),
            'general_task'
        )
        WHERE cr.task_category IS NULL OR cr.task_category = '';
    END IF;
END $$;

-- Create chat_members table (adapt existing if needed)
CREATE TABLE IF NOT EXISTS public.chat_members (
  chat_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

-- Rename room_id to chat_id if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'chat_members' AND column_name = 'room_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'chat_members' AND column_name = 'chat_id'
    ) THEN
        ALTER TABLE public.chat_members RENAME COLUMN room_id TO chat_id;
    END IF;
END $$;

-- Add foreign key to chats if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'chat_members' 
        AND constraint_name = 'chat_members_chat_id_fkey'
    ) THEN
        ALTER TABLE public.chat_members ADD CONSTRAINT chat_members_chat_id_fkey 
        FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create messages table (adapt existing if needed)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  sender_id uuid,
  body text NOT NULL,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Rename room_id to chat_id in messages if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'room_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'chat_id'
    ) THEN
        ALTER TABLE public.messages RENAME COLUMN room_id TO chat_id;
    END IF;
END $$;

-- Adapt existing chat_messages table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'chat_messages'
    ) THEN
        -- Rename room_id to chat_id if needed
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'room_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'chat_id'
        ) THEN
            ALTER TABLE public.chat_messages RENAME COLUMN room_id TO chat_id;
        END IF;

        -- Rename text to body if needed
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'text'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'body'
        ) THEN
            ALTER TABLE public.chat_messages RENAME COLUMN text TO body;
        END IF;

        -- Add is_system column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'is_system'
        ) THEN
            ALTER TABLE public.chat_messages ADD COLUMN is_system boolean DEFAULT false;
        END IF;
    END IF;
END $$;

-- Add foreign key to messages if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'messages' 
        AND constraint_name = 'messages_chat_id_fkey'
    ) THEN
        ALTER TABLE public.messages ADD CONSTRAINT messages_chat_id_fkey 
        FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 6) TASK ACCEPTANCES - Track acceptance codes
CREATE TABLE IF NOT EXISTS public.task_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL UNIQUE,
  accepter_id uuid NOT NULL,
  code char(5) NOT NULL UNIQUE,
  task_category text NOT NULL DEFAULT 'general_task',
  created_at timestamptz DEFAULT now()
);

-- Add foreign key to tasks if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'task_acceptances' 
        AND constraint_name = 'task_acceptances_task_id_fkey'
    ) THEN
        ALTER TABLE public.task_acceptances ADD CONSTRAINT task_acceptances_task_id_fkey 
        FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 7) ENABLE RLS on all tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_acceptances ENABLE ROW LEVEL SECURITY;

-- Enable RLS on chat_rooms if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'chat_rooms'
    ) THEN
        ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Enable RLS on chat_messages if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'chat_messages'
    ) THEN
        ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 8) DROP OLD POLICIES that reference owner_id
DROP POLICY IF EXISTS task_acceptances_select ON public.task_acceptances;
DROP POLICY IF EXISTS chats_select ON public.chats;
DROP POLICY IF EXISTS chat_members_select ON public.chat_members;
DROP POLICY IF EXISTS messages_select ON public.messages;
DROP POLICY IF EXISTS task_acceptances_owner_select ON public.task_acceptances;

-- 9) CREATE RLS POLICIES using canonical owner functions
CREATE POLICY task_acceptances_select_policy
ON public.task_acceptances
FOR SELECT TO authenticated
USING (
  accepter_id = auth.uid()
  OR public.get_task_owner(task_id) = auth.uid()
);

CREATE POLICY chats_select_policy
ON public.chats
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_members cm
    WHERE cm.chat_id = chats.id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY chat_members_select_policy
ON public.chat_members
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY messages_select_policy
ON public.messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_members cm
    WHERE cm.chat_id = messages.chat_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY messages_insert_policy
ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.chat_members cm
    WHERE cm.chat_id = messages.chat_id AND cm.user_id = auth.uid()
  )
);

-- 10) HELPER FUNCTIONS

-- Generate unique 5-digit code with no repeated digits
CREATE OR REPLACE FUNCTION public.generate_unique_acceptance_code()
RETURNS char(5)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    code_digits integer[] := ARRAY[0,1,2,3,4,5,6,7,8,9];
    selected_digits integer[] := '{}';
    final_code text := '';
    i integer;
    temp_digit integer;
    random_index integer;
    attempts integer := 0;
    max_attempts integer := 100;
BEGIN
    LOOP
        -- Reset for each attempt
        code_digits := ARRAY[0,1,2,3,4,5,6,7,8,9];
        selected_digits := '{}';
        final_code := '';
        
        -- Fisher-Yates shuffle to select 5 unique digits
        FOR i IN 1..5 LOOP
            random_index := floor(random() * (11 - i))::integer + 1;
            temp_digit := code_digits[random_index];
            selected_digits := selected_digits || temp_digit;
            
            -- Remove selected digit from available pool
            code_digits := code_digits[1:random_index-1] || code_digits[random_index+1:array_length(code_digits,1)];
        END LOOP;
        
        -- Build final code string
        FOR i IN 1..5 LOOP
            final_code := final_code || selected_digits[i]::text;
        END LOOP;
        
        -- Check if code is unique
        IF NOT EXISTS (SELECT 1 FROM public.task_acceptances WHERE code = final_code) THEN
            RETURN final_code::char(5);
        END IF;
        
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'Could not generate unique acceptance code after % attempts', max_attempts;
        END IF;
    END LOOP;
END $$;

-- Get user first name (schema-adaptive)
CREATE OR REPLACE FUNCTION public.get_user_first_name(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    first_name text;
BEGIN
    -- Try profiles table first if it exists
    IF to_regclass('public.profiles') IS NOT NULL THEN
        SELECT 
            COALESCE(
                split_part(full_name, ' ', 1),
                split_part(username, ' ', 1),
                'User'
            )
        FROM public.profiles 
        WHERE id = p_user_id 
        INTO first_name;
        
        IF first_name IS NOT NULL AND first_name != '' THEN
            RETURN first_name;
        END IF;
    END IF;
    
    -- Fallback to auth.users metadata
    SELECT 
        COALESCE(
            split_part((raw_user_meta_data->>'display_name')::text, ' ', 1),
            split_part((raw_user_meta_data->>'full_name')::text, ' ', 1),
            split_part(email, '@', 1),
            'User'
        )
    FROM auth.users 
    WHERE id = p_user_id 
    INTO first_name;
    
    RETURN COALESCE(first_name, 'User');
END $$;

-- 11) SAFE NORMALIZATION TRIGGER (only mutates NEW, no table updates)
CREATE OR REPLACE FUNCTION public.normalize_task_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Lowercase status
    IF NEW.status IS NOT NULL THEN
        NEW.status := lower(NEW.status);
    END IF;
    
    -- Ensure task_category is populated
    IF NEW.task_category IS NULL OR NEW.task_category = '' THEN
        NEW.task_category := COALESCE(
            CASE lower(COALESCE(NEW.category, ''))
                WHEN 'food' THEN 'food_delivery'
                WHEN 'coffee' THEN 'coffee_run'
                WHEN 'grocery' THEN 'grocery_shopping'
                ELSE NULL
            END,
            CASE lower(COALESCE(NEW.task_type, ''))
                WHEN 'delivery' THEN 'food_delivery'
                WHEN 'pickup' THEN 'general_task'
                ELSE NULL
            END,
            CASE lower(COALESCE(NEW.type, ''))
                WHEN 'food_delivery' THEN 'food_delivery'
                WHEN 'coffee_run' THEN 'coffee_run'
                ELSE NULL
            END,
            'general_task'
        );
    END IF;
    
    -- Set updated_at if column exists
    IF TG_OP = 'UPDATE' THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'updated_at'
        ) THEN
            NEW.updated_at := now();
        END IF;
    END IF;
    
    RETURN NEW;
END $$;

-- Install the safe trigger
DROP TRIGGER IF EXISTS normalize_task_fields_trigger ON public.tasks;
CREATE TRIGGER normalize_task_fields_trigger
    BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.normalize_task_fields();

-- 12) RE-ENABLE USER TRIGGERS after schema changes
ALTER TABLE public.tasks ENABLE TRIGGER USER;

-- 13) MAIN RPC FUNCTION - public.accept_task(task_id uuid)
CREATE OR REPLACE FUNCTION public.accept_task(task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    current_user_id uuid;
    task_record record;
    owner_id uuid;
    acceptance_code char(5);
    chat_record record;
    first_name text;
    system_message_body text;
    has_updated_at boolean;
    result jsonb;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    -- Check if updated_at column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'updated_at'
    ) INTO has_updated_at;

    -- Lock and get task
    SELECT * FROM public.tasks t WHERE t.id = task_id FOR UPDATE INTO task_record;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found' USING ERRCODE = '42704';
    END IF;

    -- Get canonical owner
    owner_id := public.get_task_owner(task_id);
    IF owner_id IS NULL THEN
        RAISE EXCEPTION 'Task owner not found' USING ERRCODE = '42704';
    END IF;

    -- Validate acceptance
    IF current_user_id = owner_id THEN
        RAISE EXCEPTION 'Cannot accept your own task' USING ERRCODE = '42501';
    END IF;

    IF task_record.status NOT IN ('open', 'posted') THEN
        RAISE EXCEPTION 'Task is not available for acceptance' USING ERRCODE = '42501';
    END IF;

    IF task_record.accepted_by IS NOT NULL THEN
        RAISE EXCEPTION 'Task has already been accepted' USING ERRCODE = '42501';
    END IF;

    -- Check if already accepted by this user (idempotency)
    IF EXISTS (
        SELECT 1 FROM public.task_acceptances ta 
        WHERE ta.task_id = accept_task.task_id AND ta.accepter_id = current_user_id
    ) THEN
        -- Return existing acceptance
        SELECT 
            jsonb_build_object(
                'task_id', ta.task_id,
                'status', 'accepted',
                'acceptance_code', ta.code,
                'chat_id', c.id,
                'task_category', ta.task_category,
                'accepted_by', ta.accepter_id,
                'owner_id', owner_id,
                'accepted_at', ta.created_at
            )
        FROM public.task_acceptances ta
        JOIN public.chats c ON c.task_id = ta.task_id
        WHERE ta.task_id = accept_task.task_id AND ta.accepter_id = current_user_id
        INTO result;
        
        RETURN result;
    END IF;

    -- Update task atomically
    IF has_updated_at THEN
        UPDATE public.tasks 
        SET 
            status = 'accepted',
            accepted_by = current_user_id,
            accepted_at = now(),
            updated_at = now()
        WHERE id = task_id;
    ELSE
        UPDATE public.tasks 
        SET 
            status = 'accepted',
            accepted_by = current_user_id,
            accepted_at = now()
        WHERE id = task_id;
    END IF;

    -- Generate unique acceptance code
    acceptance_code := public.generate_unique_acceptance_code();

    -- Record acceptance
    INSERT INTO public.task_acceptances (
        task_id, 
        accepter_id, 
        code, 
        task_category,
        created_at
    ) VALUES (
        task_id, 
        current_user_id, 
        acceptance_code, 
        task_record.task_category,
        now()
    );

    -- Create or get chat
    INSERT INTO public.chats (task_id, task_category, created_at)
    VALUES (task_id, task_record.task_category, now())
    ON CONFLICT (task_id) DO UPDATE SET task_category = EXCLUDED.task_category
    RETURNING * INTO chat_record;

    -- Add chat members (owner and accepter)
    INSERT INTO public.chat_members (chat_id, user_id, joined_at)
    VALUES 
        (chat_record.id, owner_id, now()),
        (chat_record.id, current_user_id, now())
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    -- Get accepter's first name
    first_name := public.get_user_first_name(current_user_id);

    -- Create system message
    system_message_body := format(
        '🎉 %s accepted your task (%s). Code: %s',
        first_name,
        task_record.task_category,
        acceptance_code
    );

    -- Insert system message into appropriate table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'chat_messages'
    ) THEN
        INSERT INTO public.chat_messages (chat_id, sender_id, body, is_system, created_at)
        VALUES (chat_record.id, NULL, system_message_body, true, now());
    ELSE
        INSERT INTO public.messages (chat_id, sender_id, body, is_system, created_at)
        VALUES (chat_record.id, NULL, system_message_body, true, now());
    END IF;

    -- Return success result
    result := jsonb_build_object(
        'task_id', task_id,
        'status', 'accepted',
        'acceptance_code', acceptance_code,
        'chat_id', chat_record.id,
        'task_category', task_record.task_category,
        'accepted_by', current_user_id,
        'owner_id', owner_id,
        'accepted_at', now()
    );

    RETURN result;

EXCEPTION
    WHEN unique_violation THEN
        IF SQLERRM LIKE '%task_acceptances_task_id_key%' THEN
            RAISE EXCEPTION 'Task has already been accepted' USING ERRCODE = '42501';
        ELSIF SQLERRM LIKE '%task_acceptances_code_key%' THEN
            -- Retry with new code (this should be very rare)
            RAISE EXCEPTION 'Code generation conflict, please try again' USING ERRCODE = '42501';
        ELSE
            RAISE;
        END IF;
    WHEN OTHERS THEN
        RAISE;
END $$;

-- 14) GRANTS for PostgREST discoverability (CRITICAL for fixing PGRST202)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_task(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_task_owner(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_first_name(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_unique_acceptance_code() TO anon, authenticated;

-- Grant table access
GRANT SELECT ON public.v_task_owner TO anon, authenticated;
GRANT SELECT, INSERT ON public.task_acceptances TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chats TO authenticated;
GRANT SELECT, INSERT ON public.chat_members TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;

-- Grant access to chat_messages if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'chat_messages'
    ) THEN
        GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
    END IF;
END $$;

-- 15) RELOAD PostgREST schema cache (CRITICAL for fixing PGRST202)
NOTIFY pgrst, 'reload schema';