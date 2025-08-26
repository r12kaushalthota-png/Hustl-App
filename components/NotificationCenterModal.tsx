import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  RefreshControl,
  ActivityIndicator,
  Image,
  Platform,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Check, CheckCheck, Clock, Package, User, Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { useNotifications } from '@/features/notifications/useNotifications';
import type { NotificationItem } from '@/features/notifications/types';

interface NotificationCenterModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationCenterModal({ visible, onClose }: NotificationCenterModalProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const {
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
  } = useNotifications();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAllRead) return;

    triggerHaptics();
    setMarkingAllRead(true);

    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationPress = async (notification: NotificationItem) => {
    triggerHaptics();

    // Mark as read if unread
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Deep link to task if task_id exists
    if (notification.task_id) {
      onClose();
      router.push(`/task/${notification.task_id}`);
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadMore();
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;

    if (diffInMinutes < 1) {
      return 'now';
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInDays < 7) {
      const days = Math.floor(diffInDays);
      return days === 1 ? 'Yesterday' : `${days}d ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'TASK_POSTED':
        return <Package size={20} color={Colors.primary} strokeWidth={2} />;
      case 'TASK_ACCEPTED':
        return <Check size={20} color={Colors.semantic.successAlert} strokeWidth={2} />;
      case 'TASK_UPDATED':
        return <Clock size={20} color={Colors.semantic.infoAlert} strokeWidth={2} />;
      default:
        return <User size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />;
    }
  };

  const getNotificationTypeColor = (type: NotificationItem['type']): string => {
    switch (type) {
      case 'TASK_POSTED':
        return Colors.primary;
      case 'TASK_ACCEPTED':
        return Colors.semantic.successAlert;
      case 'TASK_UPDATED':
        return Colors.semantic.infoAlert;
      default:
        return Colors.semantic.tabInactive;
    }
  };

  const getNotificationTypeLabel = (type: NotificationItem['type']): string => {
    switch (type) {
      case 'TASK_POSTED':
        return 'New Task';
      case 'TASK_ACCEPTED':
        return 'Accepted';
      case 'TASK_UPDATED':
        return 'Updated';
      default:
        return type;
    }
  };

  const renderNotificationItem = (notification: NotificationItem) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationItem,
        !notification.is_read && styles.unreadNotificationItem
      ]}
      onPress={() => handleNotificationPress(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationIcon}>
        {getNotificationIcon(notification.type)}
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={[
            styles.typePill,
            { backgroundColor: getNotificationTypeColor(notification.type) + '20' }
          ]}>
            <Text style={[
              styles.typePillText,
              { color: getNotificationTypeColor(notification.type) }
            ]}>
              {getNotificationTypeLabel(notification.type)}
            </Text>
          </View>
          <Text style={styles.timestamp}>
            {formatTimeAgo(notification.created_at)}
          </Text>
        </View>
        
        <Text style={[
          styles.notificationTitle,
          !notification.is_read && styles.unreadNotificationTitle
        ]}>
          {notification.title}
        </Text>
        
        <Text style={styles.notificationBody} numberOfLines={2}>
          {notification.body}
        </Text>
      </View>
      
      {!notification.is_read && (
        <View style={styles.unreadDot} />
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Bell size={48} color={Colors.semantic.tabInactive} strokeWidth={1} />
      </View>
      <Text style={styles.emptyStateText}>No notifications yet</Text>
      <Text style={styles.emptyStateSubtext}>
        You'll receive notifications when tasks are posted, accepted, or updated.
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => refresh()}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { paddingBottom: insets.bottom + 24 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Notifications</Text>
              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.markAllButton,
                      markingAllRead && styles.markAllButtonDisabled
                    ]}
                    onPress={handleMarkAllRead}
                    disabled={markingAllRead}
                  >
                    {markingAllRead ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <>
                        <CheckCheck size={16} color={Colors.primary} strokeWidth={2} />
                        <Text style={styles.markAllButtonText}>Mark All Read</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <X size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
              
              if (isCloseToBottom) {
                handleLoadMore();
              }
            }}
            scrollEventThrottle={400}
          >
            {isLoading && items.length === 0 ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading notifications...</Text>
              </View>
            ) : error ? (
              renderErrorState()
            ) : items.length > 0 ? (
              <View style={styles.notificationsList}>
                {items.map(renderNotificationItem)}
                
                {isLoadingMore && (
                  <View style={styles.loadingMore}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.loadingMoreText}>Loading more...</Text>
                  </View>
                )}
              </View>
            ) : (
              renderEmptyState()
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.semantic.screen,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.semantic.tabInactive + '40',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  markAllButtonDisabled: {
    borderColor: Colors.semantic.tabInactive,
  },
  markAllButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  loadingState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
  },
  errorState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: Colors.semantic.errorAlert,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  notificationsList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.semantic.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  unreadNotificationItem: {
    backgroundColor: Colors.primary + '08', // 3% opacity
    borderColor: Colors.primary + '20', // 12% opacity
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typePill: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 4,
  },
  unreadNotificationTitle: {
    color: Colors.semantic.headingText,
  },
  notificationBody: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    lineHeight: 20,
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
    gap: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    lineHeight: 24,
  },
});