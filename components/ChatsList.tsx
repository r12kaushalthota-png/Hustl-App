import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  RefreshControl,
  Image,
  Dimensions,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, MessageSquare } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withRepeat,
  withSequence,
  interpolate
} from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { ChatService } from '@/lib/chat';
import { ProfileService } from '@/services/profileService';
import type { InboxItem } from '@/types/chat';

const { width } = Dimensions.get('window');

// Skeleton loader component
const SkeletonRow = ({ index }: { index: number }) => {
  const shimmerAnimation = useSharedValue(0);

  React.useEffect(() => {
    shimmerAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmerAnimation.value, [0, 1], [0.3, 0.7]);
    return { opacity };
  });

  return (
    <View style={styles.skeletonRow}>
      <Animated.View style={[styles.skeletonAvatar, animatedStyle]} />
      <View style={styles.skeletonContent}>
        <Animated.View style={[styles.skeletonName, animatedStyle]} />
        <Animated.View style={[styles.skeletonMessage, animatedStyle]} />
      </View>
      <Animated.View style={[styles.skeletonTime, animatedStyle]} />
    </View>
  );
};

// Empty state component
const EmptyState = () => {
  const router = useRouter();

  const handleFindTasks = () => {
    router.push('/(tabs)/tasks');
  };

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <MessageSquare size={48} color={Colors.semantic.tabInactive} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyStateText}>No messages yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Start a conversation by accepting a task or posting one!
      </Text>
      <TouchableOpacity style={styles.findTasksButton} onPress={handleFindTasks}>
        <Text style={styles.findTasksButtonText}>Find Tasks</Text>
      </TouchableOpacity>
    </View>
  );
};

// Chat row component
const ChatRow = ({ item, onPress }: { item: InboxItem; onPress: () => void }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const handlePress = () => {
    triggerHaptics();
    onPress();
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;
    
    if (diffInMinutes < 1) {
      return 'now';
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else if (diffInDays < 7) {
      const days = Math.floor(diffInDays);
      return days === 1 ? 'Yesterday' : `${days}d`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const displayCount = item.unread_count > 99 ? '99+' : item.unread_count.toString();

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={styles.chatRow}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityLabel={`Chat with ${item.other_name || 'User'}`}
        accessibilityRole="button"
      >
        <View style={styles.avatarContainer}>
          {item.other_avatar_url ? (
            <Image source={{ uri: item.other_avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {ProfileService.getInitials(item.other_name)}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {item.other_name || 'User'}
            </Text>
            <View style={styles.chatMeta}>
              {item.last_message_at && (
                <Text style={styles.timestamp}>
                  {formatTimestamp(item.last_message_at)}
                </Text>
              )}
              {item.unread_count > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{displayCount}</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.chatPreview}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.last_message || 'No messages yet'}
            </Text>
            {item.other_major && (
              <Text style={styles.userMajor} numberOfLines={1}>
                {item.other_major}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.chatChevron}>
          <ChevronRight size={16} color={Colors.semantic.tabInactive} strokeWidth={1.5} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface ChatsListProps {
  onChatPress: (roomId: string) => void;
}

export default function ChatsList({ onChatPress }: ChatsListProps) {
  const { user, isGuest } = useAuth();
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChatInbox = useCallback(async (showRefreshIndicator = false) => {
    if (isGuest || !user) {
      setIsLoading(false);
      return;
    }

    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const { data, error: fetchError } = await ChatService.getChatInbox();
      
      if (fetchError) {
        setError(fetchError);
        return;
      }

      setInbox(data || []);
    } catch (error) {
      setError('Failed to load conversations. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, isGuest]);

  useEffect(() => {
    loadChatInbox();
  }, [loadChatInbox]);

  const handleRefresh = () => {
    loadChatInbox(true);
  };

  const handleChatPress = (item: InboxItem) => {
    onChatPress(item.room_id);
  };

  const renderChatItem = ({ item }: { item: InboxItem }) => (
    <ChatRow
      item={item}
      onPress={() => handleChatPress(item)}
    />
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 5 }).map((_, index) => (
        <SkeletonRow key={index} index={index} />
      ))}
    </View>
  );

  const keyExtractor = (item: InboxItem) => item.room_id;

  const getItemLayout = (_: any, index: number) => ({
    length: 80, // Approximate row height
    offset: 80 * index,
    index,
  });

  if (isGuest) {
    return (
      <View style={styles.guestContainer}>
        <Text style={styles.guestText}>Sign in to view your messages</Text>
      </View>
    );
  }

  if (isLoading && !isRefreshing) {
    return renderSkeleton();
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadChatInbox()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (inbox.length === 0) {
    return <EmptyState />;
  }

  return (
    <FlatList
      data={inbox}
      renderItem={renderChatItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
      contentContainerStyle={styles.listContainer}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingTop: 8,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(229, 231, 235, 0.6)',
    minHeight: 80,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  chatContent: {
    flex: 1,
    marginRight: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    flex: 1,
    marginRight: 12,
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timestamp: {
    fontSize: 13,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  chatPreview: {
    gap: 4,
  },
  lastMessage: {
    fontSize: 15,
    color: Colors.semantic.tabInactive,
    lineHeight: 20,
  },
  userMajor: {
    fontSize: 13,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
    opacity: 0.8,
  },
  chatChevron: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
    height: 20,
  },
  skeletonContainer: {
    paddingTop: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(229, 231, 235, 0.6)',
    minHeight: 80,
  },
  skeletonAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.muted,
    marginRight: 16,
  },
  skeletonContent: {
    flex: 1,
    gap: 8,
  },
  skeletonName: {
    width: '60%',
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.muted,
  },
  skeletonMessage: {
    width: '80%',
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.muted,
  },
  skeletonTime: {
    width: 40,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.muted,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
    gap: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
  findTasksButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  findTasksButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  guestText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
});