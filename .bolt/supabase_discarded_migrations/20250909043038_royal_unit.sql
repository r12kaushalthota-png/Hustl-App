@@ .. @@
     SELECT
       t.id,
       t.status,
       t.accepted_by,
       t.task_category,
-      t.owner_id,
+      public.get_task_owner(t.id) as owner_id,
       t.title
     FROM public.tasks t
     WHERE t.id = p_task_id
     FOR UPDATE;