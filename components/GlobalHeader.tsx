import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/features/notifications/useNotifications';
import NotificationBell from './NotificationBell';
import NotificationCenterModal from './NotificationCenterModal';
import ProfileSidebar from './ProfileSidebar';

interface GlobalHeaderProps {
  showSearch?: boolean;
  showNotifications?: boolean;
  title?: string;
}

export default function GlobalHeader({ 
  showSearch = true, 
  showNotifications = true,
  title 
}: GlobalHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const { unreadCount } = useNotifications();

  const [showProfileSidebar, setShowProfileSidebar] = React.useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = React.useState(false);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleProfilePress = () => {
    triggerHaptics();
    
    if (isGuest) {
      router.push('/(onboarding)/auth');
      return;
    }
    
    // Open sidebar for authenticated users
    setShowProfileSidebar(true);
  };

  const handleProfileLongPress = () => {
    if (isGuest) return;
    // TODO: Implement quick menu
    console.log('Profile long press - show quick menu');
  };

  const handleSearchPress = () => {
    console.log('Search pressed');
  };

  const handleNotificationsPress = () => {
    triggerHaptics();
    setShowNotificationCenter(true);
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isGuest) {
    return (
      <>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.content}>
            <TouchableOpacity
              style={styles.guestProfileChip}
              onPress={handleProfilePress}
              accessibilityLabel="Sign in"
              accessibilityRole="button"
            >
              <View style={styles.guestAvatar}>
                <Text style={styles.guestAvatarText}>?</Text>
              </View>
            </TouchableOpacity>
            
            <Image
              source={require('../src/assets/images/image.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            
            <View style={styles.rightSection}>
              {showSearch && (
                <TouchableOpacity style={styles.iconButton} onPress={handleSearchPress}>
                  <Search size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        
        {/* Profile Sidebar */}
        <ProfileSidebar
          visible={showProfileSidebar}
          onClose={() => setShowProfileSidebar(false)}
        />
      </>
    );
  }

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <View style={styles.leftSection}>
            <TouchableOpacity
              style={styles.profileChip}
              onPress={handleProfilePress}
              onLongPress={handleProfileLongPress}
              accessibilityLabel="Profile"
              accessibilityRole="button"
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user ? getInitials(user.displayName) : 'U'}
                </Text>
              </View>
            </TouchableOpacity>
            
            <Image
              source={require('../src/assets/images/image.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {title && (
            <Text style={styles.title}>{title}</Text>
          )}

          <View style={styles.rightSection}>
            {showSearch && (
              <TouchableOpacity style={styles.iconButton} onPress={handleSearchPress}>
                <Search size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              </TouchableOpacity>
            )}
            
            {showNotifications && (
              <NotificationBell
                unreadCount={unreadCount}
                onPress={handleNotificationsPress}
              />
            )}
          </View>
        </View>
      </View>
      
      {/* Profile Sidebar */}
      <ProfileSidebar
        visible={showProfileSidebar}
        onClose={() => setShowProfileSidebar(false)}
      />

      {/* Notification Center Modal */}
      <NotificationCenterModal
        visible={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  profileChip: {
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(0, 33, 165, 0.2)',
    padding: 2,
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  guestProfileChip: {
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(156, 163, 175, 0.3)',
    padding: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.semantic.tabInactive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  guestAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  logo: {
    width: 32,
    height: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    textAlign: 'center',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
    flex: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
});