import { supabase } from './supabase';
import type { ChatRoom, ChatMessage, InboxItem } from '@/types/chat';

export class ChatService {
  // Ensure a chat room exists for an accepted task
  // Includes retry logic for handling database lock contention
  static async ensureRoomForTask(taskId: string, maxRetries: number = 3): Promise<{ data: ChatRoom | null; error: string | null }> {
    let lastError = '';

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log('Ensuring room for task:', taskId, 'attempt:', attempt + 1);
        const { data, error } = await supabase.rpc('ensure_room_for_task', {
          p_task_id: taskId
        });

        if (error) {
          const errorMsg = error.message.toLowerCase();

          // Check if error is retryable
          const isRetryable = errorMsg.includes('unable to create') ||
                             errorMsg.includes('try again') ||
                             errorMsg.includes('locked');

          if (isRetryable && attempt < maxRetries - 1) {
            console.log('Retrying chat room creation...');
            await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
            lastError = error.message;
            continue;
          }

          console.error('RPC error:', error);
          return { data: null, error: error.message };
        }

        console.log('ensure_room_for_task result:', data);

        // The function returns a JSON object, check if it has an error
        if (data && typeof data === 'object' && 'error' in data) {
          const errMsg = data.error;

          if (errMsg.toLowerCase().includes('try again') && attempt < maxRetries - 1) {
            console.log('Retrying due to returned error...');
            await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
            lastError = errMsg;
            continue;
          }

          return { data: null, error: errMsg };
        }

        return { data: data || null, error: null };
      } catch (error) {
        console.error('Exception ensuring room:', error);

        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
          lastError = 'Failed to create chat room';
          continue;
        }

        return { data: null, error: lastError || 'Failed to create chat room' };
      }
    }

    return { data: null, error: lastError || 'Failed to create chat room after multiple attempts' };
  }

  // Get chat room for a task
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

  // Get messages for a room
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

  // Send a message
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

  // Mark room as read
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

  // Get user's chat inbox
  static async getChatInbox(): Promise<{ data: InboxItem[] | null; error: string | null }> {
    try {
      console.log('Fetching chat inbox...');
      const { data, error } = await supabase.rpc('get_chat_inbox');

      if (error) {
        console.error('Chat inbox error:', error);
        return { data: null, error: error.message };
      }

      console.log('Chat inbox data:', data);
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Exception getting chat inbox:', error);
      return { data: null, error: 'Failed to load chat inbox' };
    }
  }

  // Subscribe to new messages in a room
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