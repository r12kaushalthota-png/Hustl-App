import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationAPI } from './api';
import type { NotificationItem, NotificationFilters, NotificationResponse } from './types';

interface UseNotificationsReturn {
  items: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(filters: NotificationFilters = {}): UseNotificationsReturn {
  const { user, isGuest } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  // Load initial data
  const loadNotifications = useCallback(async (refresh = false) => {
    if (isGuest || !user) return;

    if (refresh) {
      setItems([]);
      setNextCursor(undefined);
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load notifications and unread count in parallel
      const [notificationsResult, unreadResult] = await Promise.all([
        NotificationAPI.fetchNotifications({
          ...filters,
          cursor: refresh ? undefined : nextCursor,
        }),
        NotificationAPI.fetchUnreadCount(),
      ]);

      if (notificationsResult.error) {
        setError(notificationsResult.error);
        return;
      }

      if (unreadResult.error) {
        console.warn('Failed to load unread count:', unreadResult.error);
      }

      const response = notificationsResult.data!;
      
      if (refresh) {
        setItems(response.data);
      } else {
        setItems(prev => [...prev, ...response.data]);
      }
      
      setHasMore(response.hasMore);
      setNextCursor(response.nextCursor);
      setUnreadCount(unreadResult.data || 0);

    } catch (error) {
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [user, isGuest, filters, nextCursor]);

  // Load more notifications (pagination)
  const loadMore = useCallback(async () => {
    if (isGuest || !user || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    try {
      const result = await NotificationAPI.fetchNotifications({
        ...filters,
        cursor: nextCursor,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      const response = result.data!;
      setItems(prev => [...prev, ...response.data]);
      setHasMore(response.hasMore);
      setNextCursor(response.nextCursor);

    } catch (error) {
      setError('Failed to load more notifications');
    } finally {
      setIsLoadingMore(false);
    }
  }, [user, isGuest, filters, nextCursor, hasMore, isLoadingMore]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (isGuest || !user) return;

    try {
      const { error } = await NotificationAPI.markAsRead(notificationId);

      if (error) {
        console.error('Failed to mark notification as read:', error);
        return;
      }

      // Update local state optimistically
      setItems(prev => 
        prev.map(item => 
          item.id === notificationId 
            ? { ...item, is_read: true }
            : item
        )
      );

      // Decrement unread count if notification was unread
      const notification = items.find(item => item.id === notificationId);
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [user, isGuest, items]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (isGuest || !user) return;

    try {
      const { data, error } = await NotificationAPI.markAllAsRead();

      if (error) {
        console.error('Failed to mark all notifications as read:', error);
        return;
      }

      // Update local state optimistically
      setItems(prev => 
        prev.map(item => ({ ...item, is_read: true }))
      );
      setUnreadCount(0);

    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [user, isGuest]);

  // Refresh notifications
  const refresh = useCallback(async () => {
    await loadNotifications(true);
  }, [loadNotifications]);

  // Load notifications on mount and when user changes
  useEffect(() => {
    if (user && !isGuest) {
      loadNotifications(true);
    } else {
      setItems([]);
      setUnreadCount(0);
      setError(null);
    }
  }, [user, isGuest]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (isGuest || !user) return;

    const unsubscribe = NotificationAPI.subscribeToNotifications(
      user.id,
      (notification: NotificationItem) => {
        // Add new notification to the beginning of the list
        setItems(prev => [notification, ...prev]);
        
        // Increment unread count if notification is unread
        if (!notification.is_read) {
          setUnreadCount(prev => prev + 1);
        }
      }
    );

    return unsubscribe;
  }, [user, isGuest]);

  return {
    items,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}