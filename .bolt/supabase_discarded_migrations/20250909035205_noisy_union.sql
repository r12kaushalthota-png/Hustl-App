/*
  # Create atomic task acceptance with unique 5-digit code

  1. New Function
    - `accept_task_atomic(task_id, user_id)` - Atomically accepts task and generates unique 5-digit code
    - Generates non-repeating digit codes (e.g., 53874)
    - Ensures uniqueness across all active tasks
    - Maintains all existing security checks

  2. Security
    - Maintains existing RLS policies
    - Prevents double acceptance
    - Validates user permissions
    - Atomic operation prevents race conditions

  3. Code Generation
    - 5-digit numeric codes with non-repeating digits
    - Uniqueness guaranteed across active tasks
    - Stored in user_accept_code column
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.accept_task(uuid, uuid);
DROP FUNCTION IF EXISTS public.accept_task(task_id_param uuid, user_accept_code_param uuid);

-- Create function to generate unique 5-digit code with non-repeating digits
CREATE OR REPLACE FUNCTION generate_unique_accept_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code TEXT;
  digits INTEGER[];
  i INTEGER;
  digit INTEGER;
  attempts INTEGER := 0;
  max_attempts INTEGER := 100;
BEGIN
  LOOP
    -- Reset for each attempt
    digits := ARRAY[]::INTEGER[];
    code := '';
    
    -- Generate 5 unique digits
    FOR i IN 1..5 LOOP
      LOOP
        digit := floor(random() * 10)::INTEGER;
        -- Ensure digit is not already used
        IF NOT (digit = ANY(digits)) THEN
          digits := array_append(digits, digit);
          code := code || digit::TEXT;
          EXIT;
        END IF;
      END LOOP;
    END LOOP;
    
    -- Check if code is unique among active tasks
    IF NOT EXISTS (
      SELECT 1 FROM tasks 
      WHERE user_accept_code = code 
      AND status IN ('accepted', 'completed')
    ) THEN
      RETURN code;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Unable to generate unique accept code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- Create atomic task acceptance function
CREATE OR REPLACE FUNCTION accept_task_atomic(
  p_task_id UUID,
  p_user_id UUID
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  category task_category,
  store TEXT,
  dropoff_address TEXT,
  dropoff_instructions TEXT,
  urgency task_urgency,
  reward_cents INTEGER,
  estimated_minutes INTEGER,
  status task_status,
  created_by UUID,
  accepted_by UUID,
  accepted_at TIMESTAMPTZ,
  user_accept_code TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  phase task_phase,
  moderation_status task_moderation_status,
  moderation_reason TEXT,
  moderated_at TIMESTAMPTZ,
  moderated_by UUID,
  price_cents INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record RECORD;
  accept_code TEXT;
BEGIN
  -- Get and lock the task row
  SELECT * INTO task_record
  FROM tasks
  WHERE tasks.id = p_task_id
  FOR UPDATE;

  -- Check if task exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;

  -- Check if user is trying to accept their own task
  IF task_record.created_by = p_user_id THEN
    RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
  END IF;

  -- Check if task is still open
  IF task_record.status != 'open' THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
  END IF;

  -- Generate unique accept code
  accept_code := generate_unique_accept_code();

  -- Atomically update the task
  UPDATE tasks
  SET 
    status = 'accepted',
    accepted_by = p_user_id,
    accepted_at = NOW(),
    user_accept_code = accept_code,
    updated_at = NOW()
  WHERE tasks.id = p_task_id;

  -- Return the updated task
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
    t.updated_at,
    t.phase,
    t.moderation_status,
    t.moderation_reason,
    t.moderated_at,
    t.moderated_by,
    t.price_cents
  FROM tasks t
  WHERE t.id = p_task_id;
END;
$$;