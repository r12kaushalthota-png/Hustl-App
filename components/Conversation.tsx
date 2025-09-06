import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  Image, 
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Shield } from 'lucide-react-native';
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
import { supabase } from '@/lib/supabase';
import type { ChatMessage, UserProfile } from '@/types/chat';

const { width } = Dimensions.get('window');

// Typing indicator component
const TypingIndicator = () => {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  React.useEffect(() => {
    const animateDots = () => {
      dot1.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0, { duration: 400 })
        ),
        -1,
        true
      );
      
      setTimeout(() => {
        dot2.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withTiming(0, { duration: 400 })
          ),
          -1,
          true
        );
      }, 133);
      
      setTimeout(() => {
        dot3.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withTiming(0, { duration: 400 })
          ),
          -1,
          true
        );
      }, 266);
    };

    animateDots();
  }, []);

  const animatedDot1Style = useAnimatedStyle(() => ({
    opacity: dot1.value,
  }));

  const animatedDot2Style = useAnimatedStyle(() => ({
    opacity: dot2.value,
  }));

  const animatedDot3Style = useAnimatedStyle(() => ({
    opacity: dot3.value,
  }));

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <View style={styles.typingDots}>
          <Animated.View style={[styles.typingDot, animatedDot1Style]} />
          <Animated.View style={[styles.typingDot, animatedDot2Style]} />
          <Animated.View style={[styles.typingDot, animatedDot3Style]} />
        </View>
      </View>
    </View>
  );
};

// Message bubble component
const MessageBubble = ({ 
  message, 
  isOwnMessage, 
  showAvatar, 
  otherUserProfile,
  onAvatarPress 
}: { 
  message: ChatMessage; 
  isOwnMessage: boolean; 
  showAvatar: boolean;
  otherUserProfile: UserProfile | null;
  onAvatarPress: () => void;
}) => {
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[
      styles.messageContainer,
      isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
    ]}>
      <View style={styles.messageRow}>
        {/* Avatar for received messages */}
        {!isOwnMessage && (
          <View style={styles.messageAvatarContainer}>
            {showAvatar ? (
              <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.7}>
                {otherUserProfile?.avatar_url ? (
                  <Image 
                    source={{ uri: otherUserProfile.avatar_url }} 
                    style={styles.messageAvatar} 
                  />
                ) : (
                  <View style={styles.messageAvatarPlaceholder}>
                    <Text style={styles.messageAvatarText}>
                      {ProfileService.getInitials(otherUserProfile?.full_name || otherUserProfile?.username)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.messageAvatarSpacer} />
            )}
          </View>
        )}

        {/* Message bubble */}
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {message.text}
          </Text>
        </View>
      </View>

      {/* Timestamp */}
      <View style={[
        styles.messageFooter,
        isOwnMessage ? styles.ownMessageFooter : styles.otherMessageFooter
      ]}>
        <Text style={styles.messageTime}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
};

interface ConversationProps {
  roomId: string;
  onProfilePress: (userId: string) => void;
}

export default function Conversation({ roomId, onProfilePress }: ConversationProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherUserProfile, setOtherUserProfile] = useState<UserProfile | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Load messages and other user info
  useEffect(() => {
    loadMessages();
    loadOtherUserInfo();
  }, [roomId]);

  // Realtime subscription
  useEffect(() => {
    if (!roomId) return;

    unsubscribeRef.current = ChatService.subscribeToRoom(roomId, (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [roomId]);

  // Mark room as read when screen is focused
  useEffect(() => {
    if (roomId) {
      ChatService.markRoomRead(roomId);
    }
  }, [roomId]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await ChatService.getMessages(roomId);
      
      if (data) {
        setMessages(data);
        setTimeout(scrollToBottom, 100);
      } else if (error) {
        console.error('Failed to load messages:', error);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOtherUserInfo = async () => {
    try {
      // Get room info to find the other user
      const { data: roomData } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          chat_members!inner(user_id)
        `)
        .eq('id', roomId)
        .single();

      if (roomData?.chat_members) {
        const otherMember = roomData.chat_members.find((m: any) => m.user_id !== user?.id);
        if (otherMember) {
          // Load other user's profile using ProfileService
          const { data: profile } = await ProfileService.getProfile(otherMember.user_id);
          setOtherUserProfile(profile);
        }
      }
    } catch (error) {
      console.error('Failed to load other user info:', error);
    }
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      if (!user) {
        setInputText(messageText);
        return;
      }

      const { error } = await ChatService.sendMessage(roomId, user.id, messageText);
      
      if (error) {
        console.error('Failed to send message:', error);
        setInputText(messageText);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setInputText(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleProfilePress = useCallback(() => {
    if (!otherUserProfile) return;
    
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    
    onProfilePress(otherUserProfile.id);
  }, [otherUserProfile, onProfilePress]);

  const shouldShowAvatar = (message: ChatMessage, index: number): boolean => {
    if (message.sender_id === user?.id) return false; // Never show avatar for own messages
    
    // Show avatar if it's the first message or if the previous message was from a different sender
    if (index === 0) return true;
    
    const prevMessage = messages[index - 1];
    return prevMessage.sender_id !== message.sender_id;
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isOwnMessage = message.sender_id === user?.id;
    const showAvatar = shouldShowAvatar(message, index);
    
    return (
      <MessageBubble
        key={message.id}
        message={message}
        isOwnMessage={isOwnMessage}
        showAvatar={showAvatar}
        otherUserProfile={otherUserProfile}
        onAvatarPress={handleProfilePress}
      />
    );
  };

  const renderHeader = () => (
    <TouchableOpacity style={styles.headerCenter} onPress={handleProfilePress}>
      <View style={styles.headerAvatarContainer}>
        {otherUserProfile?.avatar_url ? (
          <Image source={{ uri: otherUserProfile.avatar_url }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarPlaceholder}>
            <Text style={styles.headerAvatarText}>
              {ProfileService.getInitials(otherUserProfile?.full_name || otherUserProfile?.username)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.headerInfo}>
        <View style={styles.headerNameRow}>
          <Text style={styles.headerTitle}>
            {ProfileService.getDisplayName(otherUserProfile || {} as UserProfile)}
          </Text>
          {otherUserProfile?.is_verified && (
            <View style={styles.verifiedBadge}>
              <Shield size={12} color={Colors.white} strokeWidth={2} />
            </View>
          )}
        </View>
        <Text style={styles.headerSubtitle}>
          @{otherUserProfile?.username || 'user'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        {renderHeader()}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
        keyboardShouldPersistTaps="handled"
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
            </View>
            <Text style={styles.emptyText}>Start the conversation</Text>
            <Text style={styles.emptySubtext}>Send a message to get things started!</Text>
          </View>
        ) : (
          <>
            {messages.map((message, index) => renderMessage(message, index))}
            {isTyping && <TypingIndicator />}
          </>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.inputWrapper}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message..."
              placeholderTextColor={Colors.semantic.tabInactive}
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isSending) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isSending}
              accessibilityLabel="Send message"
              accessibilityRole="button"
            >
              <Send 
                size={16} 
                color={inputText.trim() && !isSending ? Colors.primary : Colors.semantic.tabInactive} 
                strokeWidth={2} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatarContainer: {
    marginRight: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  headerInfo: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.semantic.successAlert,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  messagesContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 12,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: width * 0.75,
  },
  messageAvatarContainer: {
    marginRight: 6,
    marginBottom: 2,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  messageAvatarSpacer: {
    width: 28,
    height: 28,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: width * 0.7,
  },
  ownMessageBubble: {
    backgroundColor: '#0021A5',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#F5F5F5',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: Colors.white,
  },
  otherMessageText: {
    color: Colors.semantic.bodyText,
  },
  messageFooter: {
    marginTop: 4,
  },
  ownMessageFooter: {
    alignItems: 'flex-end',
  },
  otherMessageFooter: {
    alignItems: 'flex-start',
    marginLeft: 34, // Account for avatar space
  },
  messageTime: {
    fontSize: 10,
    color: Colors.semantic.tabInactive,
  },
  typingContainer: {
    alignItems: 'flex-start',
    marginBottom: 12,
    marginLeft: 34, // Account for avatar space
  },
  typingBubble: {
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.semantic.tabInactive,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  inputWrapper: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.semantic.inputText,
    backgroundColor: 'transparent',
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});