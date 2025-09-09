@@ .. @@
     -- Get task details and lock for update
     SELECT 
       t.id,
       t.status,
-      t.owner_id,
+      public.get_task_owner(t.id) as owner_id,
       t.task_category,
       t.title
     INTO task_record
     FROM public.tasks t 
     WHERE t.id = p_task_id
     FOR UPDATE;