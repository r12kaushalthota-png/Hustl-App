/*
  # Create conversations view for chat inbox

  1. New Views
    - `conversations` - Returns one row per conversation with partner info and last message
  
  2. Features
    - Deduplicates conversations by partner
    - Includes partner profile information
    - Shows last message and unread count
    - Ordered by last message time
*/

-- Create conversations view for chat inbox
CREATE OR REPLACE VIEW conversations AS
WITH conversation_partners AS (
  -- Get the other user in each chat room for the current user
  SELECT DISTINCT
    cr.id as room_id,
    cr.task_id,
    CASE 
      WHEN cm1.user_id = auth.uid() THEN cm2.user_id
      ELSE cm1.user_id
    END as partner_id,
    cr.last_message,
    cr.last_message_at,
    CASE 
      WHEN cm1.user_id = auth.uid() THEN cm1.unread_count
      ELSE cm2.unread_count
    END as unread_count
  FROM chat_rooms cr
  JOIN chat_members cm1 ON cm1.room_id = cr.id
  JOIN chat_members cm2 ON cm2.room_id = cr.id AND cm2.user_id != cm1.user_id
  WHERE cm1.user_id = auth.uid() OR cm2.user_id = auth.uid()
),
latest_conversations AS (
  -- Get the most recent conversation per partner
  SELECT DISTINCT ON (partner_id)
    room_id,
    task_id,
    partner_id,
    last_message,
    last_message_at,
    unread_count
  FROM conversation_partners
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
  COALESCE(lc.unread_count, 0) as unread_count,
  lc.task_id
FROM latest_conversations lc
LEFT JOIN profiles p ON p.id = lc.partner_id
ORDER BY lc.last_message_at DESC NULLS LAST;

-- Grant access to authenticated users
GRANT SELECT ON conversations TO authenticated;
GRANT SELECT ON conversations TO anon;

-- Add RLS policy
ALTER VIEW conversations SET (security_invoker = true);