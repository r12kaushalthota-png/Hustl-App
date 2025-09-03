import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { ChatService } from '@/lib/chat';
import type { InboxItem } from '@/types/chat';
import GlobalHeader from '@/components/GlobalHeader';


export default function ChatsScreen() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const [inbox, setInbox] = React.useState<InboxItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  React.useEffect(() => {
    loadChatInbox();
  }, []);

  const loadChatInbox = async () => {
    if (isGuest || !user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await ChatService.getChatInbox();
      if (data) {
        setInbox(data);
      }
      if (error) {
        console.error('Failed to load chat inbox:', error);
      }
    } catch (error) {
      console.error('Failed to load chat inbox:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadChatInbox();
    setIsRefreshing(false);
  };

  const handleChatPress = (roomId: string) => {
    router.push(`/chat/${roomId}`);
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
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const getInitials = (name: string | null): string => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderChatItem = (item: InboxItem) => (
    <TouchableOpacity 
      key={item.room_id} 
      style={styles.conversationRow} 
      onPress={() => handleChatPress(item.room_id)}
      activeOpacity={0.7}
      accessibilityLabel={`Chat with ${item.other_name || 'User'}`}
      accessibilityRole="button"
    >
      <View style={styles.avatarContainer}>
        {item.other_avatar_url ? (
          <Image source={{ uri: item.other_avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{getInitials(item.other_name)}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {item.other_name || 'User'}
          </Text>
          <View style={styles.conversationMeta}>
            {item.last_message_at && (
              <Text style={styles.timestamp}>{formatTimestamp(item.last_message_at)}</Text>
            )}
            {item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.conversationPreview}>
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
      
      <View style={styles.conversationChevron}>
        <ChevronRight size={16} color={Colors.semantic.tabInactive} strokeWidth={1.5} />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image
        source={require('../../src/assets/images/image.png')}
        style={styles.emptyStateLogo}
        resizeMode="contain"
      />
      <Text style={styles.emptyStateText}>No messages yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Start a conversation by accepting a task or posting one!
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <GlobalHeader showSearch={true} showNotifications={true} />

      <ScrollView 
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
      >
        {isLoading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : inbox.length > 0 ? (
          <View style={styles.conversationsList}>
            {inbox.map(renderChatItem)}
          </View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  content: {
    flex: 1,
  },
  loadingState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
  },
  conversationsList: {
    paddingTop: 8,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(229, 231, 235, 0.6)',
    backgroundColor: Colors.white,
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
  conversationContent: {
    flex: 1,
    marginRight: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  conversationName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    flex: 1,
    marginRight: 12,
  },
  conversationMeta: {
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
  conversationPreview: {
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
  conversationChevron: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
    height: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
    gap: 20,
  },
  emptyStateLogo: {
    width: 80,
    height: 80,
    opacity: 0.2,
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