export interface ChatRoom {
  id: string;
  task_id: string;
  created_at: string;
  last_message: string | null;
  last_message_at: string | null;
}

export interface ChatMember {
  room_id: string;
  user_id: string;
  unread_count: number;
  last_read_at: string | null;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  text: string;
  created_at: string;
}

export interface MessageRead {
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface InboxItem {
  room_id: string;
  task_id: string;
  other_id: string;
  other_name: string | null;
  other_avatar_url: string | null;
  other_major: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  major: string | null;
  university: string | null;
  created_at: string;
  updated_at: string;
}