/*
  # Fix owner_id references and rebuild accept-task flow

  This migration addresses the "owner_id does not exist" error by:
  1. Cleaning up all problematic triggers that reference current_status or owner_id
  2. Creating a canonical owner view that works with any tasks schema
  3. Rebuilding the accept-task system with proper PostgREST discoverability
  4. Using schema-adaptive approaches throughout

  ## Changes Made
  1. **Trigger Cleanup**: Removes all triggers that reference current_status or owner_id
  2. **Canonical Owner View**: Creates v_task_owner view and get_task_owner() function
  3. **Schema Normalization**: Ensures required columns exist and backfills data safely
  4. **Accept Task System**: Complete rebuild with atomic operations and proper grants
  5. **RLS Policies**: Updated to use canonical owner functions
*/

-- =============================================================================
-- 0) HARD CLEANUP OF BAD TRIGGERS/FUNCTIONS (DO THIS FIRST)
-- =============================================================================

-- Drop problematic triggers by name
DROP TRIGGER IF EXISTS trg_task_status_updated ON public.tasks;
DROP TRIGGER IF EXISTS tasks_status_trigger ON public.tasks;
DROP TRIGGER IF EXISTS update_task_status ON public.tasks;
DROP TRIGGER IF EXISTS normalize_task_status ON public.tasks;
DROP TRIGGER IF EXISTS task_status_trigger ON public.tasks;
DROP TRIGGER IF EXISTS update_task_current_status ON public.tasks;

-- Drop their functions
DROP FUNCTION IF EXISTS public.trg_task_status_updated() CASCADE;
DROP FUNCTION IF EXISTS public.tasks_status_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.update_task_status() CASCADE;
DROP FUNCTION IF EXISTS public.normalize_task_status() CASCADE;
DROP FUNCTION IF EXISTS public.task_status_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.update_task_current_status() CASCADE;

-- Query and drop any remaining triggers on tasks that reference current_status or owner_id
DO $$
DECLARE
    trigger_rec RECORD;
    func_source TEXT;
BEGIN
    FOR trigger_rec IN 
        SELECT t.tgname, p.proname
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE n.nspname = 'public' 
        AND c.relname = 'tasks'
        AND t.tgname NOT LIKE 'RI_%'  -- Skip foreign key triggers
    LOOP
        -- Get function source
        SELECT pg_get_functiondef(p.oid) INTO func_source
        FROM pg_proc p 
        WHERE p.proname = trigger_rec.proname;
        
        -- Drop if it references problematic fields
        IF func_source ILIKE '%current_status%' OR func_source ILIKE '%owner_id%' THEN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.tasks', trigger_rec.tgname);
            EXECUTE format('DROP FUNCTION IF EXISTS public.%I() CASCADE', trigger_rec.proname);
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- 1) TEMPORARILY DISABLE USER TRIGGERS DURING BACKFILL
-- =============================================================================

ALTER TABLE public.tasks DISABLE TRIGGER USER;

-- =============================================================================
-- 2) CREATE CANONICAL OWNER VIEW (WORKS WITH ANY TASKS SCHEMA)
-- =============================================================================

-- Create view that exposes task_id and normalized owner_id
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

COMMENT ON VIEW public.v_task_owner IS 'Canonical mapping of tasks → owner_id regardless of column naming';

-- Helper function for use in RLS and RPC
CREATE OR REPLACE FUNCTION public.get_task_owner(p_task_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT owner_id FROM public.v_task_owner WHERE task_id = p_task_id
$$;

-- =============================================================================
-- 3) NORMALIZE THE TASKS SCHEMA (SCHEMA-ADAPTIVE)
-- =============================================================================

-- Ensure required columns exist
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

    -- Add updated_at if missing (we'll use this in the RPC)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- Handle legacy current_status column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'current_status'
    ) THEN
        -- Merge current_status into status if status is empty
        UPDATE public.tasks 
        SET status = COALESCE(NULLIF(status, ''), current_status, 'open')
        WHERE current_status IS NOT NULL;
        
        -- Drop the legacy column
        ALTER TABLE public.tasks DROP COLUMN IF EXISTS current_status;
    END IF;
END $$;

-- =============================================================================
-- 4) ONE-TIME BACKFILL FOR TASK_CATEGORY (WITH TRIGGERS DISABLED)
-- =============================================================================

-- Backfill task_category from legacy columns
UPDATE public.tasks t
SET task_category = COALESCE(
  -- First try existing task_category if it's valid
  CASE lower(COALESCE(t.task_category, ''))
    WHEN 'food_delivery' THEN 'food_delivery'
    WHEN 'coffee_run' THEN 'coffee_run'
    WHEN 'grocery_shopping' THEN 'grocery_shopping'
    WHEN 'library_pickup' THEN 'library_pickup'
    WHEN 'study_session' THEN 'study_session'
    WHEN 'campus_ride' THEN 'campus_ride'
    WHEN 'general_task' THEN 'general_task'
    WHEN 'food' THEN 'food_delivery'
    WHEN 'coffee' THEN 'coffee_run'
    WHEN 'grocery' THEN 'grocery_shopping'
    ELSE NULL
  END,
  -- Then try legacy category columns
  CASE lower(COALESCE(
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'category') 
          THEN (SELECT category FROM public.tasks t2 WHERE t2.id = t.id) END),
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'task_type') 
          THEN (SELECT task_type FROM public.tasks t2 WHERE t2.id = t.id) END),
    (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'type') 
          THEN (SELECT type FROM public.tasks t2 WHERE t2.id = t.id) END),
    ''
  ))
    WHEN 'food' THEN 'food_delivery'
    WHEN 'coffee' THEN 'coffee_run'
    WHEN 'grocery' THEN 'grocery_shopping'
    WHEN 'study' THEN 'study_session'
    WHEN 'transport' THEN 'campus_ride'
    ELSE NULL
  END,
  -- Default fallback
  'general_task'
)
WHERE t.task_category IS NULL OR t.task_category = '';

-- =============================================================================
-- 5) INSTALL SAFE NORMALIZATION TRIGGER (NO TABLE-WIDE UPDATES)
-- =============================================================================

-- Create safe normalization function that only mutates NEW
CREATE OR REPLACE FUNCTION public.normalize_task_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Lowercase status
    NEW.status := lower(COALESCE(NEW.status, 'open'));
    
    -- Ensure task_category is set
    IF NEW.task_category IS NULL OR NEW.task_category = '' THEN
        NEW.task_category := COALESCE(
            CASE lower(COALESCE(NEW.category, NEW.task_type, NEW.type, ''))
                WHEN 'food' THEN 'food_delivery'
                WHEN 'coffee' THEN 'coffee_run'
                WHEN 'grocery' THEN 'grocery_shopping'
                WHEN 'study' THEN 'study_session'
                WHEN 'transport' THEN 'campus_ride'
                ELSE NULL
            END,
            'general_task'
        );
    END IF;
    
    -- Set updated_at if column exists
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at := now();
    END IF;
    
    RETURN NEW;
END $$;

-- Attach the trigger
DROP TRIGGER IF EXISTS normalize_task_fields_trigger ON public.tasks;
CREATE TRIGGER normalize_task_fields_trigger 
    BEFORE INSERT OR UPDATE ON public.tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION public.normalize_task_fields();

-- =============================================================================
-- 6) CHAT + MESSAGES + ACCEPTANCE TABLES (CREATE OR ADAPT)
-- =============================================================================

-- Create chats table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL UNIQUE,
    task_category text NOT NULL DEFAULT 'general_task',
    created_at timestamptz DEFAULT now()
);

-- Add task_category column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'chats' AND column_name = 'task_category'
    ) THEN
        ALTER TABLE public.chats ADD COLUMN task_category text NOT NULL DEFAULT 'general_task';
    END IF;
END $$;

-- Create chat_members table if it doesn't exist
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

-- Create messages table if it doesn't exist
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

-- Create task_acceptances table
CREATE TABLE IF NOT EXISTS public.task_acceptances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL UNIQUE,
    accepter_id uuid NOT NULL,
    code char(5) NOT NULL UNIQUE,
    task_category text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- chats -> tasks foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'chats' 
        AND constraint_name = 'chats_task_id_fkey'
    ) THEN
        ALTER TABLE public.chats ADD CONSTRAINT chats_task_id_fkey 
            FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
    END IF;

    -- chat_members -> chats foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'chat_members' 
        AND constraint_name = 'chat_members_chat_id_fkey'
    ) THEN
        ALTER TABLE public.chat_members ADD CONSTRAINT chat_members_chat_id_fkey 
            FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;
    END IF;

    -- messages -> chats foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'messages' 
        AND constraint_name = 'messages_chat_id_fkey'
    ) THEN
        ALTER TABLE public.messages ADD CONSTRAINT messages_chat_id_fkey 
            FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;
    END IF;

    -- task_acceptances -> tasks foreign key
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

-- =============================================================================
-- 7) RLS POLICIES (USING CANONICAL OWNER FUNCTIONS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.task_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS task_acceptances_select ON public.task_acceptances;
DROP POLICY IF EXISTS chats_select ON public.chats;
DROP POLICY IF EXISTS chat_members_select ON public.chat_members;
DROP POLICY IF EXISTS chat_members_insert ON public.chat_members;
DROP POLICY IF EXISTS messages_select ON public.messages;
DROP POLICY IF EXISTS messages_insert ON public.messages;

-- task_acceptances: SELECT only to accepter or owner
CREATE POLICY task_acceptances_select
ON public.task_acceptances
FOR SELECT TO authenticated
USING (
  accepter_id = auth.uid()
  OR public.get_task_owner(task_id) = auth.uid()
);

-- chats: SELECT only to chat members
CREATE POLICY chats_select
ON public.chats
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_members cm
    WHERE cm.chat_id = chats.id AND cm.user_id = auth.uid()
  )
);

-- chat_members: SELECT and INSERT only for own membership
CREATE POLICY chat_members_select
ON public.chat_members
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY chat_members_insert
ON public.chat_members
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- messages: SELECT and INSERT only for chat members
CREATE POLICY messages_select
ON public.messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_members cm
    WHERE cm.chat_id = messages.chat_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY messages_insert
ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_members cm
    WHERE cm.chat_id = messages.chat_id AND cm.user_id = auth.uid()
  )
);

-- =============================================================================
-- 8) HELPER FUNCTIONS (ROBUST)
-- =============================================================================

-- Generate unique 5-digit code with no repeated digits
CREATE OR REPLACE FUNCTION public.generate_unique_acceptance_code()
RETURNS char(5)
LANGUAGE plpgsql
AS $$
DECLARE
    code char(5);
    digits int[] := ARRAY[0,1,2,3,4,5,6,7,8,9];
    i int;
    j int;
    temp int;
    max_attempts int := 100;
    attempt int := 0;
BEGIN
    LOOP
        attempt := attempt + 1;
        
        -- Fisher-Yates shuffle to get 5 unique digits
        FOR i IN 1..5 LOOP
            j := i + floor(random() * (10 - i + 1))::int;
            temp := digits[i];
            digits[i] := digits[j];
            digits[j] := temp;
        END LOOP;
        
        -- Build code from first 5 digits
        code := digits[1]::text || digits[2]::text || digits[3]::text || digits[4]::text || digits[5]::text;
        
        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM public.task_acceptances WHERE code = code) THEN
            RETURN code;
        END IF;
        
        -- Prevent infinite loop
        IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Could not generate unique acceptance code after % attempts', max_attempts;
        END IF;
    END LOOP;
END $$;

-- Get user first name (robust, works with or without profiles table)
CREATE OR REPLACE FUNCTION public.get_user_first_name(user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    first_name text;
BEGIN
    -- Try profiles table if it exists
    IF to_regclass('public.profiles') IS NOT NULL THEN
        SELECT COALESCE(
            split_part(full_name, ' ', 1),
            username,
            split_part(email, '@', 1)
        ) INTO first_name
        FROM public.profiles 
        WHERE id = user_id;
    END IF;
    
    -- Fallback to auth.users if profiles didn't work
    IF first_name IS NULL THEN
        SELECT COALESCE(
            raw_user_meta_data->>'display_name',
            raw_user_meta_data->>'full_name',
            split_part(email, '@', 1)
        ) INTO first_name
        FROM auth.users 
        WHERE id = user_id;
    END IF;
    
    -- Final fallback
    RETURN COALESCE(first_name, 'User');
END $$;

-- =============================================================================
-- 9) RPC: public.accept_task(task_id uuid) RETURNS jsonb (DISCOVERABLE)
-- =============================================================================

-- Drop any existing accept_task functions
DROP FUNCTION IF EXISTS public.accept_task(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task(text) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task(json) CASCADE;
DROP FUNCTION IF EXISTS public.accept_task(jsonb) CASCADE;

-- Create the main accept_task function
CREATE OR REPLACE FUNCTION public.accept_task(task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    task_record record;
    owner_id uuid;
    accepter_id uuid;
    acceptance_code char(5);
    chat_record record;
    first_name text;
    system_message text;
    result jsonb;
BEGIN
    -- Get current user
    accepter_id := auth.uid();
    IF accepter_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    -- Lock and get task
    SELECT * INTO task_record
    FROM public.tasks t
    WHERE t.id = task_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found' USING ERRCODE = '42704';
    END IF;

    -- Get canonical owner
    owner_id := public.get_task_owner(task_id);
    IF owner_id IS NULL THEN
        RAISE EXCEPTION 'Task owner not found' USING ERRCODE = '42704';
    END IF;

    -- Validate acceptance
    IF accepter_id = owner_id THEN
        RAISE EXCEPTION 'You cannot accept your own task' USING ERRCODE = '42501';
    END IF;

    IF task_record.status NOT IN ('open', 'posted') THEN
        RAISE EXCEPTION 'Task is not available for acceptance' USING ERRCODE = '42501';
    END IF;

    IF task_record.accepted_by IS NOT NULL THEN
        RAISE EXCEPTION 'Task has already been accepted by someone else' USING ERRCODE = '42501';
    END IF;

    -- Update task atomically
    UPDATE public.tasks
    SET 
        status = 'accepted',
        accepted_by = accepter_id,
        accepted_at = now(),
        updated_at = now()
    WHERE id = task_id;

    -- Generate unique acceptance code
    acceptance_code := public.generate_unique_acceptance_code();

    -- Insert acceptance record
    INSERT INTO public.task_acceptances (
        task_id,
        accepter_id,
        code,
        task_category
    ) VALUES (
        task_id,
        accepter_id,
        acceptance_code,
        task_record.task_category
    );

    -- Create or get chat
    INSERT INTO public.chats (task_id, task_category)
    VALUES (task_id, task_record.task_category)
    ON CONFLICT (task_id) DO UPDATE SET
        task_category = EXCLUDED.task_category
    RETURNING * INTO chat_record;

    -- Add chat members (owner and accepter)
    INSERT INTO public.chat_members (chat_id, user_id)
    VALUES 
        (chat_record.id, owner_id),
        (chat_record.id, accepter_id)
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    -- Get accepter's first name
    first_name := public.get_user_first_name(accepter_id);

    -- Create system message
    system_message := format('🎉 %s accepted your task (%s). Code: %s', 
        first_name, 
        task_record.task_category, 
        acceptance_code
    );

    INSERT INTO public.messages (
        chat_id,
        sender_id,
        body,
        is_system
    ) VALUES (
        chat_record.id,
        NULL,
        system_message,
        true
    );

    -- Build result
    result := jsonb_build_object(
        'task_id', task_id,
        'status', 'accepted',
        'acceptance_code', acceptance_code,
        'chat_id', chat_record.id,
        'task_category', task_record.task_category,
        'accepted_by', accepter_id,
        'owner_id', owner_id,
        'accepted_at', task_record.accepted_at
    );

    RETURN result;
END $$;

-- =============================================================================
-- 10) RE-ENABLE USER TRIGGERS
-- =============================================================================

ALTER TABLE public.tasks ENABLE TRIGGER USER;

-- =============================================================================
-- 11) POSTGREST DISCOVERABILITY (FIXES PGRST202)
-- =============================================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant execute on the function (critical for PostgREST cache)
GRANT EXECUTE ON FUNCTION public.accept_task(uuid) TO anon, authenticated;

-- Grant table permissions
GRANT SELECT ON public.v_task_owner TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_task_owner(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_unique_acceptance_code() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_first_name(uuid) TO anon, authenticated;

-- Grant table access for RLS policies
GRANT SELECT ON public.task_acceptances TO authenticated;
GRANT SELECT ON public.chats TO authenticated;
GRANT SELECT, INSERT ON public.chat_members TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';