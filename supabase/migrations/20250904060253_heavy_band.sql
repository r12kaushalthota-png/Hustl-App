/*
  # Reliable Accept Task Flow

  1. Database Schema
    - Create task_status enum with proper values
    - Create tasks table with minimal required fields
    - Add proper indexes for performance
    - Set up RLS policies for security

  2. Atomic Accept Function
    - Single-winner RPC function using atomic updates
    - Prevents race conditions and double acceptance
    - Returns updated task or throws specific error

  3. Triggers
    - Auto-update updated_at timestamp
    - Maintain data consistency
*/

-- Wrap everything in a transaction for atomicity
BEGIN;

-- 1) Create task_status enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('open', 'accepted', 'in_progress', 'completed', 'cancelled');
  END IF;
END$$;

-- 2) Create tasks table with minimal required fields
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'general', -- Keep as TEXT to avoid enum conflicts
  status task_status NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL,
  accepted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Additional fields for compatibility with existing app
  store text DEFAULT '',
  dropoff_address text DEFAULT '',
  dropoff_instructions text DEFAULT '',
  urgency text DEFAULT 'medium',
  reward_cents integer DEFAULT 0,
  estimated_minutes integer DEFAULT 30,
  price_cents integer DEFAULT 0,
  location_text text DEFAULT '',
  task_current_status text DEFAULT 'posted',
  last_status_update timestamptz DEFAULT now(),
  assignee_id uuid,
  phase text DEFAULT 'none',
  moderation_status text DEFAULT 'approved',
  moderation_reason text,
  moderated_at timestamptz,
  moderated_by uuid
);

-- 3) Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger 
LANGUAGE plpgsql 
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END$$;

-- 4) Drop and recreate trigger to ensure it exists
DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW 
  EXECUTE FUNCTION public.set_updated_at();

-- 5) Create performance indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_accepted_by ON public.tasks(accepted_by);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status_created_at ON public.tasks(status, created_at DESC);

-- 6) Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 7) Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS tasks_read_policy ON public.tasks;
DROP POLICY IF EXISTS tasks_insert_policy ON public.tasks;
DROP POLICY IF EXISTS tasks_update_policy ON public.tasks;
DROP POLICY IF EXISTS tasks_select_visible ON public.tasks;
DROP POLICY IF EXISTS tasks_insert_owner ON public.tasks;
DROP POLICY IF EXISTS tasks_update_owner_or_assignee ON public.tasks;

-- 8) Create comprehensive RLS policies
-- Read policy: open tasks are public, others visible to creator or assignee
CREATE POLICY tasks_read_policy
  ON public.tasks FOR SELECT
  USING (
    status = 'open'::task_status
    OR created_by = auth.uid()
    OR accepted_by = auth.uid()
    OR assignee_id = auth.uid()
  );

-- Insert policy: authenticated users can create tasks as themselves
CREATE POLICY tasks_insert_policy
  ON public.tasks FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Update policy: creator can edit while open, assignee can edit after acceptance
CREATE POLICY tasks_update_policy
  ON public.tasks FOR UPDATE
  USING (
    (created_by = auth.uid() AND status = 'open'::task_status)
    OR (accepted_by = auth.uid())
    OR (assignee_id = auth.uid())
  );

-- 9) Atomic accept task function - single winner guaranteed
CREATE OR REPLACE FUNCTION public.accept_task(p_task_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  category text,
  status task_status,
  created_by uuid,
  accepted_by uuid,
  created_at timestamptz,
  accepted_at timestamptz,
  updated_at timestamptz,
  store text,
  dropoff_address text,
  dropoff_instructions text,
  urgency text,
  reward_cents integer,
  estimated_minutes integer,
  price_cents integer,
  location_text text,
  task_current_status text,
  last_status_update timestamptz,
  assignee_id uuid,
  phase text,
  moderation_status text,
  moderation_reason text,
  moderated_at timestamptz,
  moderated_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record public.tasks;
  current_user_id uuid;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_AUTHENTICATED';
  END IF;

  -- Atomic update: only one winner can change status from 'open' to 'accepted'
  UPDATE public.tasks
  SET 
    status = 'accepted'::task_status,
    accepted_by = current_user_id,
    accepted_at = now(),
    assignee_id = current_user_id,
    task_current_status = 'accepted',
    last_status_update = now(),
    updated_at = now()
  WHERE 
    tasks.id = p_task_id
    AND tasks.status = 'open'::task_status
    AND tasks.created_by != current_user_id -- Prevent self-acceptance
  RETURNING * INTO task_record;

  -- Check if update succeeded
  IF task_record.id IS NULL THEN
    -- Check why it failed
    SELECT * INTO task_record FROM public.tasks WHERE tasks.id = p_task_id;
    
    IF task_record.id IS NULL THEN
      RAISE EXCEPTION 'TASK_NOT_FOUND';
    ELSIF task_record.created_by = current_user_id THEN
      RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
    ELSIF task_record.status != 'open'::task_status THEN
      RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
    ELSE
      RAISE EXCEPTION 'TASK_ACCEPTANCE_FAILED';
    END IF;
  END IF;

  -- Return the accepted task
  RETURN QUERY SELECT 
    task_record.id,
    task_record.title,
    task_record.description,
    task_record.category,
    task_record.status,
    task_record.created_by,
    task_record.accepted_by,
    task_record.created_at,
    task_record.accepted_at,
    task_record.updated_at,
    task_record.store,
    task_record.dropoff_address,
    task_record.dropoff_instructions,
    task_record.urgency,
    task_record.reward_cents,
    task_record.estimated_minutes,
    task_record.price_cents,
    task_record.location_text,
    task_record.task_current_status,
    task_record.last_status_update,
    task_record.assignee_id,
    task_record.phase,
    task_record.moderation_status,
    task_record.moderation_reason,
    task_record.moderated_at,
    task_record.moderated_by;
END$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_task(uuid) TO authenticated;

COMMIT;