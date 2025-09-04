/*
  # Fix task_category enum error

  1. Create missing enum
    - Create `task_category` enum if it doesn't exist
    - Add all existing category values from tasks table
    - Add 'unknown' as fallback value

  2. Convert column
    - Convert tasks.category from text to task_category enum
    - Set proper default value
    - Handle any invalid existing values

  3. Update constraints
    - Remove old text-based check constraints
    - Add proper enum-based validation
*/

-- Create task_category enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_category') THEN
    CREATE TYPE task_category AS ENUM ('unknown');
  END IF;
END $$;

-- Add all existing category values to the enum
DO $$
DECLARE
  category_value text;
BEGIN
  -- Get all distinct category values from tasks table
  FOR category_value IN 
    SELECT DISTINCT category 
    FROM tasks 
    WHERE category IS NOT NULL 
    AND category != ''
  LOOP
    -- Add each value to enum if it doesn't exist
    BEGIN
      EXECUTE format('ALTER TYPE task_category ADD VALUE IF NOT EXISTS %L', category_value);
    EXCEPTION
      WHEN duplicate_object THEN
        -- Value already exists, continue
        NULL;
    END;
  END LOOP;
END $$;

-- Ensure common category values exist in enum
DO $$
BEGIN
  -- Add standard categories if they don't exist
  BEGIN
    ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'food';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'coffee';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'grocery';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Update any null or empty category values to 'unknown'
UPDATE tasks 
SET category = 'unknown' 
WHERE category IS NULL OR category = '';

-- Convert the column from text to enum
DO $$
BEGIN
  -- Check if column is already the correct type
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'category' 
    AND data_type = 'text'
  ) THEN
    -- Convert column to enum type
    ALTER TABLE tasks 
    ALTER COLUMN category TYPE task_category 
    USING category::task_category;
    
    -- Set default value
    ALTER TABLE tasks 
    ALTER COLUMN category SET DEFAULT 'unknown'::task_category;
  END IF;
END $$;

-- Remove old text-based check constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE table_name = 'tasks' 
    AND constraint_name = 'tasks_category_check'
  ) THEN
    ALTER TABLE tasks DROP CONSTRAINT tasks_category_check;
  END IF;
END $$;

-- Update the accept_task function to handle enum properly
CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid, p_user_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  category task_category,
  store text,
  dropoff_address text,
  dropoff_instructions text,
  urgency text,
  reward_cents integer,
  estimated_minutes integer,
  status task_status,
  task_current_status task_current_status,
  last_status_update timestamptz,
  created_by uuid,
  accepted_by uuid,
  accepted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record record;
BEGIN
  -- Check if task exists
  SELECT * INTO task_record
  FROM tasks t
  WHERE t.id = p_task_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND';
  END IF;
  
  -- Check if user is trying to accept their own task
  IF task_record.created_by = p_user_id THEN
    RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
  END IF;
  
  -- Check if task is already accepted
  IF task_record.status != 'open'::task_status THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
  END IF;
  
  -- Atomically update the task
  UPDATE tasks
  SET 
    status = 'accepted'::task_status,
    accepted_by = p_user_id,
    accepted_at = now(),
    task_current_status = 'accepted'::task_current_status,
    last_status_update = now(),
    updated_at = now()
  WHERE 
    tasks.id = p_task_id 
    AND tasks.status = 'open'::task_status
    AND tasks.created_by != p_user_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
  END IF;
  
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
    t.task_current_status,
    t.last_status_update,
    t.created_by,
    t.accepted_by,
    t.accepted_at,
    t.created_at,
    t.updated_at
  FROM tasks t
  WHERE t.id = p_task_id;
END;
$$;