import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/theme/colors';
import GlobalHeader from '@/components/GlobalHeader';
import ChatsList from '@/components/ChatsList';
import ProfileSheet from '@/components/ProfileSheet';

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showProfileSheet, setShowProfileSheet] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);

  const handleChatPress = (roomId: string) => {
    router.push(`/chat/${roomId}`);
  };
  
  const handleProfilePress = (userId: string) => {
    setSelectedUserId(userId);
    setShowProfileSheet(true);
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <GlobalHeader showSearch={true} showNotifications={true} />
        
        <View style={styles.content}>
          <ChatsList 
            onChatPress={handleChatPress}
          />
        </View>
      </SafeAreaView>

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
  content: {
    flex: 1,
  },
});