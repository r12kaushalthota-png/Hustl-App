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
import { MessageSquare } from 'lucide-react-native';
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
const ChatRow = ({ 
  item, 
  onPress, 
  onProfilePress 
}: { 
  item: InboxItem; 
  onPress: () => void;
  onProfilePress: (userId: string) => void;
}) => {
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

  const handleProfilePress = () => {
    triggerHaptics();
    onProfilePress(item.other_id);
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
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={handleProfilePress}
          activeOpacity={0.7}
        >
          {item.other_avatar_url ? (
            <Image source={{ uri: item.other_avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {ProfileService.getInitials(item.other_name)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <View style={styles.chatContent}>
          <TouchableOpacity 
            style={styles.nameContainer}
            onPress={handleProfilePress}
            activeOpacity={0.7}
          >
            <Text style={styles.chatName} numberOfLines={1}>
              {item.other_name || 'User'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message || 'No messages yet'}
          </Text>
        </View>
        
        <View style={styles.rightSection}>
          {item.last_message_at && (
            <Text style={styles.timestamp}>
              {formatTimestamp(item.last_message_at)}
            </Text>
          )}
          {item.unread_count > 0 && (
            <View style={styles.unreadDot} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface ChatsListProps {
  onChatPress: (roomId: string) => void;
  onProfilePress?: (userId: string) => void;
}

export default function ChatsList({ onChatPress, onProfilePress }: ChatsListProps) {
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

  const handleProfilePress = (userId: string) => {
    onProfilePress?.(userId);
  };

  const renderChatItem = ({ item }: { item: InboxItem }) => (
    <ChatRow
      item={item}
      onPress={() => handleChatPress(item)}
      onProfilePress={handleProfilePress}
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
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    minHeight: 72,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  chatContent: {
    flex: 1,
    gap: 4,
  },
  nameContainer: {
    alignSelf: 'flex-start',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    lineHeight: 18,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  skeletonContainer: {
    paddingTop: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    minHeight: 72,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.muted,
    marginRight: 12,
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
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.muted,
  },
  skeletonTime: {
    width: 30,
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