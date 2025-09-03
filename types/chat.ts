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

export interface TypingUser {
  userId: string;
  isTyping: boolean;
}

export interface ChatSocketEvents {
  // Client to server
  join_room: { roomId: string };
  send_message: { roomId: string; text: string };
  typing: { roomId: string; isTyping: boolean };
  read_messages: { roomId: string };

  // Server to client
  joined: { roomId: string };
  message: ChatMessage;
  typing: { roomId: string; userId: string; isTyping: boolean };
  read_receipt: { roomId: string; userId: string };
  error: { message: string };
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
  bio: string | null;
  is_verified: boolean;
  completed_tasks_count: number;
  response_rate: number;
  xp: number;
  level: number;
  credits: number;
  bio: string | null;
  is_verified: boolean;
  completed_tasks_count: number;
  response_rate: number;
  xp: number;
  level: number;
  credits: number;
  created_at: string;
  updated_at: string;
}