@@ .. @@
 CREATE OR REPLACE FUNCTION accept_task(p_task_id uuid)
 RETURNS TABLE (
   task_id uuid,
-  status text,
+  task_status text,
   acceptance_code text,
   chat_id uuid,
   task_category text,
   accepted_by uuid,
   owner_id uuid,
   accepted_at timestamptz
 ) 
 LANGUAGE plpgsql
 SECURITY DEFINER
 AS $$
 DECLARE
   v_task_record RECORD;
   v_acceptance_code text;
   v_chat_room_id uuid;
 BEGIN
   -- Get and lock the task
   SELECT t.id, t.title, t.created_by, t.category, t.accepted_by, t.status
   INTO v_task_record
-  FROM tasks
+  FROM tasks t
   WHERE t.id = p_task_id
   FOR UPDATE;
 
   -- Check if task exists
   IF NOT FOUND THEN
     RAISE EXCEPTION 'Task not found';
   END IF;
 
   -- Check if task is available
-  IF status != 'open' THEN
+  IF v_task_record.status != 'open' THEN
     RAISE EXCEPTION 'Task is not available for acceptance';
   END IF;
 
   -- Check if user is trying to accept their own task
-  IF created_by = auth.uid() THEN
+  IF v_task_record.created_by = auth.uid() THEN
     RAISE EXCEPTION 'Cannot accept your own task';
   END IF;
 
   -- Generate 5-digit acceptance code
   v_acceptance_code := LPAD((RANDOM() * 99999)::int::text, 5, '0');
 
   -- Update task with acceptance
-  UPDATE tasks 
+  UPDATE tasks t
   SET 
-    status = 'accepted',
-    accepted_by = auth.uid(),
-    accepted_at = NOW(),
-    user_accept_code = gen_random_uuid(),
-    updated_at = NOW()
+    t.status = 'accepted',
+    t.accepted_by = auth.uid(),
+    t.accepted_at = NOW(),
+    t.user_accept_code = gen_random_uuid(),
+    t.updated_at = NOW()
   WHERE t.id = p_task_id;
 
   -- Create chat room
   INSERT INTO chat_rooms (task_id)
   VALUES (p_task_id)
   RETURNING id INTO v_chat_room_id;
 
   -- Add chat members
   INSERT INTO chat_members (room_id, user_id)
   VALUES 
     (v_chat_room_id, v_task_record.created_by),
     (v_chat_room_id, auth.uid());
 
   -- Return success data
   RETURN QUERY SELECT
     v_task_record.id,
-    'accepted'::text,
+    'accepted'::text as task_status,
     v_acceptance_code,
     v_chat_room_id,
     v_task_record.category,
     auth.uid(),
     v_task_record.created_by,
     NOW();
 
 END;
 $$;