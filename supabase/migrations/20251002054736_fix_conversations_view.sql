/*
  # Fix conversations view for chat inbox
  
  1. Purpose
    - Recreate the conversations view to work with chat_rooms structure
    - Ensure compatibility with existing chats tab code
  
  2. Changes
    - Drop and recreate conversations view
    - Use chat_rooms, chat_members, and profiles tables
    - Show one conversation per partner with latest message
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS conversations;

-- Create conversations view
CREATE OR REPLACE VIEW conversations AS
WITH conversation_partners AS (
  SELECT DISTINCT
    cr.id as room_id,
    cr.task_id,
    CASE 
      WHEN t.created_by = auth.uid() THEN t.accepted_by
      ELSE t.created_by
    END as partner_id,
    cr.last_message,
    cr.last_message_at,
    COALESCE(cm.unread_count, 0) as unread_count
  FROM chat_rooms cr
  JOIN tasks t ON t.id = cr.task_id
  LEFT JOIN chat_members cm ON cm.room_id = cr.id AND cm.user_id = auth.uid()
  WHERE t.created_by = auth.uid() OR t.accepted_by = auth.uid()
),
latest_conversations AS (
  SELECT DISTINCT ON (partner_id)
    room_id,
    task_id,
    partner_id,
    last_message,
    last_message_at,
    unread_count
  FROM conversation_partners
  WHERE partner_id IS NOT NULL
  ORDER BY partner_id, last_message_at DESC NULLS LAST
)
SELECT 
  lc.room_id as conversation_id,
  lc.partner_id as partner_user_id,
  COALESCE(p.full_name, p.username, 'User') as partner_display_name,
  p.avatar_url as partner_avatar_url,
  p.major as partner_major,
  lc.last_message as last_message_text,
  lc.last_message_at,
  lc.unread_count,
  lc.task_id
FROM latest_conversations lc
LEFT JOIN profiles p ON p.id = lc.partner_id
ORDER BY lc.last_message_at DESC NULLS LAST;

-- Grant access
GRANT SELECT ON conversations TO authenticated;
GRANT SELECT ON conversations TO anon;