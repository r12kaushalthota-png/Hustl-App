import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  RefreshControl,
  Image,
  TextInput,
  Platform,
  ActivityIndicator,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, MessageSquare, X, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  withSpring
} from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import ProfileSheet from '@/components/ProfileSheet';
import { useGlobalProfile } from '@/contexts/GlobalProfileContext';

const { width } = Dimensions.get('window');

interface Conversation {
  conversation_id: string;
  partner_user_id: string;
  partner_display_name: string;
  partner_avatar_url: string | null;
  partner_major: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  unread_count: number;
  task_id: string;
}

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
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    router.push('/(tabs)/tasks');
  };

  return (
    <View style={[styles.emptyState, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.emptyIconContainer}>
        <MessageSquare size={48} color={Colors.semantic.tabInactive} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyStateText}>No chats yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Start a conversation by accepting a task or posting one!
      </Text>
      <TouchableOpacity 
        style={styles.findTasksButton} 
        onPress={handleFindTasks}
        activeOpacity={0.8}
      >
        <Text style={styles.findTasksButtonText}>Find tasks to message</Text>
      </TouchableOpacity>
    </View>
  );
};

// Enhanced Chat Row Component
const ChatRow = ({ 
  conversation, 
  onPress, 
  onProfilePress,
  searchQuery 
}: { 
  conversation: Conversation; 
  onPress: () => void;
  onProfilePress: (userId: string) => void;
  searchQuery: string;
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
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
    opacity.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
    opacity.value = withTiming(1, { duration: 150 });
  };

  const handlePress = () => {
    triggerHaptics();
    onPress();
  };

  const handleAvatarPress = () => {
    triggerHaptics();
    onProfilePress(conversation.partner_user_id);
  };

  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return '';
    
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

  const getInitials = (name: string): string => {
    if (!name || !name.trim()) return 'U';
    
    return name
      .trim()
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <Text key={index} style={styles.highlightedText}>{part}</Text>
      ) : (
        part
      )
    );
  };

  const isUnread = conversation.unread_count > 0;
  const displayCount = conversation.unread_count > 9 ? '9+' : conversation.unread_count.toString();

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[
          styles.chatRow,
          isUnread && styles.unreadChatRow
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityLabel={`Chat with ${conversation.partner_display_name}`}
        accessibilityRole="button"
        accessibilityHint={isUnread ? `${conversation.unread_count} unread messages` : undefined}
      >
        {/* Avatar */}
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={handleAvatarPress}
          activeOpacity={0.7}
          accessibilityLabel={`View ${conversation.partner_display_name}'s profile`}
          accessibilityRole="button"
        >
          {conversation.partner_avatar_url ? (
            <Image 
              source={{ uri: conversation.partner_avatar_url }} 
              style={styles.avatar} 
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {getInitials(conversation.partner_display_name)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        {/* Content */}
        <View style={styles.chatContent}>
          <View style={styles.nameRow}>
            <Text 
              style={[
                styles.chatName,
                isUnread && styles.unreadChatName
              ]} 
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {highlightText(conversation.partner_display_name, searchQuery)}
            </Text>
            
            {/* Timestamp */}
            {conversation.last_message_at && (
              <Text style={styles.timestamp}>
                {formatTimestamp(conversation.last_message_at)}
              </Text>
            )}
          </View>
          
          <View style={styles.messageRow}>
            <Text 
              style={[
                styles.lastMessage,
                isUnread && styles.unreadLastMessage
              ]} 
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {conversation.last_message_text ? 
                highlightText(conversation.last_message_text, searchQuery) : 
                'No messages yet'
              }
            </Text>
            
            {/* Unread Badge */}
            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{displayCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Enhanced Header Component
const ChatsHeader = ({ 
  onSearchToggle, 
  showSearch, 
  searchQuery, 
  onSearchChange 
}: {
  onSearchToggle: () => void;
  showSearch: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}) => {
  const { user } = useAuth();
  const { showProfilePanel } = useGlobalProfile();
  const searchWidth = useSharedValue(0);
  const searchOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (showSearch) {
      searchWidth.value = withSpring(width - 120, { damping: 15 });
      searchOpacity.value = withTiming(1, { duration: 200 });
    } else {
      searchWidth.value = withTiming(0, { duration: 200 });
      searchOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [showSearch]);

  const animatedSearchStyle = useAnimatedStyle(() => ({
    width: searchWidth.value,
    opacity: searchOpacity.value,
  }));

  const handleProfilePress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    showProfilePanel();
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        {/* Left: User Avatar */}
        <TouchableOpacity 
          style={styles.userAvatarButton}
          onPress={handleProfilePress}
          activeOpacity={0.7}
          accessibilityLabel="View profile"
          accessibilityRole="button"
        >
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user ? getInitials(user.displayName) : 'U'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Center: App Icon or Search */}
        <View style={styles.centerSection}>
          {showSearch ? (
            <Animated.View style={[styles.searchContainer, animatedSearchStyle]}>
              <Search size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder="Search conversations..."
                placeholderTextColor={Colors.semantic.tabInactive}
                autoFocus
                returnKeyType="search"
              />
            </Animated.View>
          ) : (
            <View style={styles.appIconContainer}>
              <Image
                source={require('@assets/images/image.png')}
                style={styles.appIcon}
                resizeMode="contain"
              />
            </View>
          )}
        </View>

        {/* Right: Search Toggle */}
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={onSearchToggle}
          activeOpacity={0.7}
          accessibilityLabel={showSearch ? "Close search" : "Search conversations"}
          accessibilityRole="button"
        >
          {showSearch ? (
            <X size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
          ) : (
            <Search size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isGuest } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Load conversations
  const loadConversations = useCallback(async (showRefreshIndicator = false) => {
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
      const { data, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });
      
      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setConversations(data || []);
      setFilteredConversations(data || []);
    } catch (error) {
      setError('Failed to load conversations. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, isGuest]);

  // Filter conversations based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = conversations.filter(conv => 
      conv.partner_display_name.toLowerCase().includes(query) ||
      (conv.last_message_text && conv.last_message_text.toLowerCase().includes(query))
    );
    
    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (isGuest || !user) return;

    const channel = supabase
      .channel('chat_messages_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          // Reload conversations when new message arrives
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, isGuest, loadConversations]);

  const handleRefresh = () => {
    loadConversations(true);
  };

  const handleSearchToggle = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    
    if (showSearch) {
      // Closing search
      setShowSearch(false);
      setSearchQuery('');
    } else {
      // Opening search
      setShowSearch(true);
      // Focus will be handled by autoFocus prop
    }
  };

  const handleChatPress = (conversation: Conversation) => {
    router.push(`/chat/${conversation.conversation_id}`);
  };
  
  const handleProfilePress = (userId: string) => {
    setSelectedUserId(userId);
    setShowProfileSheet(true);
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <ChatRow
      conversation={item}
      onPress={() => handleChatPress(item)}
      onProfilePress={handleProfilePress}
      searchQuery={searchQuery}
    />
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 6 }).map((_, index) => (
        <SkeletonRow key={index} index={index} />
      ))}
    </View>
  );

  const keyExtractor = (item: Conversation) => item.conversation_id;

  const getItemLayout = (_: any, index: number) => ({
    length: 80, // Row height
    offset: 80 * index,
    index,
  });

  if (isGuest) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ChatsHeader 
          onSearchToggle={handleSearchToggle}
          showSearch={showSearch}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <View style={[styles.guestContainer, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.guestIconContainer}>
            <User size={48} color={Colors.semantic.tabInactive} strokeWidth={1.5} />
          </View>
          <Text style={styles.guestText}>Sign in to view your messages</Text>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => router.push('/(onboarding)/auth')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ChatsHeader 
          onSearchToggle={handleSearchToggle}
          showSearch={showSearch}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        
        <View style={styles.content}>
          {isLoading && !isRefreshing ? (
            renderSkeleton()
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => loadConversations()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredConversations.length === 0 ? (
            searchQuery ? (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No conversations found</Text>
                <Text style={styles.noResultsSubtext}>
                  Try a different search term
                </Text>
              </View>
            ) : (
              <EmptyState />
            )
          ) : (
            <FlatList
              data={filteredConversations}
              renderItem={renderConversationItem}
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
              contentContainerStyle={[
                styles.listContainer,
                { paddingBottom: insets.bottom + 12 }
              ]}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
            />
          )}
        </View>
    </SafeAreaView>

      {/* Profile Sheet */}
      <ProfileSheet
        visible={showProfileSheet}
        onClose={() => {
          setShowProfileSheet(false);
          setSelectedUserId(null);
        }}
        userId={selectedUserId}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(229, 231, 235, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 64,
  },
  userAvatarButton: {
    width: 44,
    height: 44,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 33, 165, 0.2)',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  appIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIcon: {
    width: 28,
    height: 28,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.muted,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.inputText,
    paddingVertical: 4,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.4)',
  },
  content: {
    flex: 1,
  },
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
    borderBottomColor: 'rgba(229, 231, 235, 0.8)',
    minHeight: 80,
  },
  unreadChatRow: {
    backgroundColor: 'rgba(0, 33, 165, 0.02)',
  },
  avatarContainer: {
    marginRight: 16,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
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
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    flex: 1,
    marginRight: 8,
  },
  unreadChatName: {
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 13,
    color: Colors.semantic.tabInactive,
    lineHeight: 18,
    flex: 1,
    marginRight: 8,
  },
  unreadLastMessage: {
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
  highlightedText: {
    backgroundColor: 'rgba(0, 33, 165, 0.2)',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
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
    borderBottomColor: 'rgba(229, 231, 235, 0.8)',
    minHeight: 80,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    paddingHorizontal: 16,
    paddingVertical: 60,
    gap: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
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
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 44,
  },
  findTasksButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 20,
  },
  guestIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    textAlign: 'center',
  },
  signInButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 44,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
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
    minHeight: 44,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
  },
});