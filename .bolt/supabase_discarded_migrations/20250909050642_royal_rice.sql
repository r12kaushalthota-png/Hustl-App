@@ .. @@
   -- Create or get existing chat room for the task
-  INSERT INTO chat_rooms (task_id, created_at)
-  VALUES (p_task_id, NOW())
-  RETURNING id INTO v_chat_room_id;
+  -- Try to get existing chat room first
+  SELECT id INTO v_chat_room_id
+  FROM chat_rooms
+  WHERE task_id = p_task_id;
+  
+  -- If no chat room exists, create one
+  IF v_chat_room_id IS NULL THEN
+    INSERT INTO chat_rooms (task_id, created_at)
+    VALUES (p_task_id, NOW())
+    RETURNING id INTO v_chat_room_id;
+  END IF;