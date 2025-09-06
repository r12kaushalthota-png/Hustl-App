@@ .. @@
 /*
   # Fix task_current_status enum and accept_task function
 
   1. Enum Values
     - Ensure task_current_status enum includes 'accepted' value
   
   2. Function Updates
     - Drop existing accept_task function versions
     - Recreate with proper enum casting and explicit column references
     - Maintain all security and validation logic
   
   3. Security
     - Preserve RLS and atomic operations
     - Prevent race conditions with proper locking
 */
 
 -- Ensure the enum has the correct values
 DO $$
 BEGIN
   -- Check if 'accepted' value exists in task_current_status enum
   IF NOT EXISTS (
     SELECT 1 FROM pg_enum e
     JOIN pg_type t ON e.enumtypid = t.oid
     WHERE t.typname = 'task_current_status' AND e.enumlabel = 'accepted'
   ) THEN
     ALTER TYPE task_current_status ADD VALUE 'accepted';
   END IF;
 END $$;
 
 -- Drop all existing versions of accept_task function
 DROP FUNCTION IF EXISTS accept_task(uuid);
 DROP FUNCTION IF EXISTS accept_task(uuid, uuid);
 DROP FUNCTION IF EXISTS public.accept_task(uuid);
 DROP FUNCTION IF EXISTS public.accept_task(uuid, uuid);
 
 -- Create the accept_task function with explicit column references
 CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid, p_user_id uuid)
 RETURNS TABLE(
   id uuid,
   title text,
   description text,
   category text,
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
   created_at timestamptz,
   updated_at timestamptz,
   price_cents integer,
   location_text text,
   accepted_at timestamptz,
   assignee_id uuid,
   phase task_phase,
   moderation_status task_moderation_status,
   moderation_reason text,
   moderated_at timestamptz,
   moderated_by uuid
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 AS $$
 DECLARE
   task_record RECORD;
 BEGIN
   -- Validate authentication
   IF auth.uid() IS NULL THEN
     RAISE EXCEPTION 'USER_NOT_AUTHENTICATED';
   END IF;
   
   IF auth.uid() != p_user_id THEN
     RAISE EXCEPTION 'UNAUTHORIZED_USER_ID';
   END IF;
   
   -- Lock and fetch the task with explicit table reference
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
     t.created_at,
     t.updated_at,
     t.price_cents,
     t.location_text,
     t.accepted_at,
     t.assignee_id,
     t.phase,
     t.moderation_status,
     t.moderation_reason,
     t.moderated_at,
     t.moderated_by
   INTO task_record
   FROM tasks t
   WHERE t.id = p_task_id
   FOR UPDATE;
   
   -- Validate task exists
   IF NOT FOUND THEN
     RAISE EXCEPTION 'TASK_NOT_FOUND';
   END IF;
   
   -- Validate task is available for acceptance
   IF task_record.status != 'open' THEN
     RAISE EXCEPTION 'TASK_NOT_AVAILABLE';
   END IF;
   
   -- Validate user cannot accept their own task
   IF task_record.created_by = p_user_id THEN
     RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_TASK';
   END IF;
   
   -- Validate task is not already accepted
   IF task_record.accepted_by IS NOT NULL THEN
     RAISE EXCEPTION 'TASK_ALREADY_ACCEPTED';
   END IF;
   
   -- Update task with explicit column references and proper enum casting
   UPDATE tasks t
   SET 
     status = 'accepted'::task_status,
     task_current_status = 'accepted'::task_current_status,
     accepted_by = p_user_id,
     assignee_id = p_user_id,
     accepted_at = NOW(),
     last_status_update = NOW(),
     updated_at = NOW()
   WHERE t.id = p_task_id
     AND t.status = 'open'
     AND t.accepted_by IS NULL;
   
   -- Verify update succeeded
   IF NOT FOUND THEN
     RAISE EXCEPTION 'TASK_ACCEPTANCE_FAILED';
   END IF;
   
   -- Return updated task data with explicit column references
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
     t.created_at,
     t.updated_at,
     t.price_cents,
     t.location_text,
     t.accepted_at,
     t.assignee_id,
     t.phase,
     t.moderation_status,
     t.moderation_reason,
     t.moderated_at,
     t.moderated_by
   FROM tasks t
   WHERE t.id = p_task_id;
 END;
 $$;