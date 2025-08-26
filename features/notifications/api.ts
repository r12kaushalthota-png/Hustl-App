import { supabase } from '@/lib/supabase';
import type { NotificationItem, NotificationFilters, NotificationResponse } from './types';

export class NotificationAPI {
  /**
   * Get unread notification count for current user
   */
  static async fetchUnreadCount(): Promise<{ data: number | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('get_unread_count');

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || 0, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to fetch unread count' };
    }
  }

  /**
   * Fetch notifications with pagination
   */
  static async fetchNotifications(filters: NotificationFilters = {}): Promise<{ 
    data: NotificationResponse | null; 
    error: string | null 
  }> {
    try {
      const { limit = 20, cursor, type, is_read } = filters;

      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit + 1); // Fetch one extra to check if there are more

      // Apply filters
      if (type) {
        query = query.eq('type', type);
      }

      if (is_read !== undefined) {
        query = query.eq('is_read', is_read);
      }

      // Apply cursor for pagination
      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: error.message };
      }

      const notifications = data || [];
      const hasMore = notifications.length > limit;
      const items = hasMore ? notifications.slice(0, limit) : notifications;
      const nextCursor = hasMore ? items[items.length - 1]?.created_at : undefined;

      return {
        data: {
          data: items,
          hasMore,
          nextCursor,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: 'Failed to fetch notifications' };
    }
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(notificationId: string): Promise<{ error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Failed to mark notification as read' };
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<{ data: number | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('mark_all_notifications_read');

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || 0, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to mark all notifications as read' };
    }
  }

  /**
   * Subscribe to real-time notification updates
   */
  static subscribeToNotifications(
    userId: string,
    onNotification: (notification: NotificationItem) => void
  ) {
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onNotification(payload.new as NotificationItem);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }
}