import { supabase } from './supabase';
import type { ChatRoom, ChatMessage, InboxItem } from '@/types/chat';

export class ChatService {
  static async ensureRoomForTask(taskId: string): Promise<{ data: ChatRoom | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('ensure_room_for_task', { 
        p_task_id: taskId 
      });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || null, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to create chat room' };
    }
  }

  static async getRoomForTask(taskId: string): Promise<{ data: ChatRoom | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('task_id', taskId)
        .maybeSingle();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to get chat room' };
    }
  }

  static async getMessages(roomId: string): Promise<{ data: ChatMessage[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Failed to load messages' };
    }
  }

  static async sendMessage(roomId: string, senderId: string, text: string): Promise<{ data: ChatMessage | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: senderId,
          text: text.trim()
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to send message' };
    }
  }

  static async markRoomRead(roomId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.rpc('mark_room_read', { p_room_id: roomId });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Failed to mark room as read' };
    }
  }

  static async getChatInbox(): Promise<{ data: InboxItem[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('get_chat_inbox');

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Failed to load chat inbox' };
    }
  }

  static subscribeToRoom(roomId: string, onMessage: (message: ChatMessage) => void) {
    const channel = supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages', 
          filter: `room_id=eq.${roomId}` 
        },
        (payload) => {
          onMessage(payload.new as ChatMessage);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }
}