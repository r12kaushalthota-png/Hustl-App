import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import Conversation from '@/components/Conversation';
import ProfileSheet from '@/components/ProfileSheet';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const roomId = params.roomId as string;
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleBack = () => {
    router.back();
  };

  const handleProfilePress = (userId: string) => {
    setSelectedUserId(userId);
    setShowProfileSheet(true);
  };

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={Colors.semantic.bodyText} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Conversation */}
        <Conversation 
          roomId={roomId} 
          onProfilePress={handleProfilePress}
        />
      </View>

      {/* Profile Sheet */}
      <ProfileSheet
        visible={showProfileSheet}
        onClose={() => {
          setShowProfileSheet(false);
          setSelectedUserId(null);
        }}
        userId={selectedUserId}
        currentChatRoomId={roomId}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(229, 231, 235, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.semantic.headingText,
  },
  placeholder: {
    width: 36,
  },
});