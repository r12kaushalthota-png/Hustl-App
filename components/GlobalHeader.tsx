import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Bell, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  withRepeat,
  withSequence
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/features/notifications/useNotifications';
import NotificationBell from './NotificationBell';
import NotificationCenterModal from './NotificationCenterModal';
import ProfileSidebar from './ProfileSidebar';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Enhanced Profile Avatar with Level Badge
const ProfileAvatar = ({ user, isGuest, onPress }: { 
  user: any; 
  onPress: () => void;
}) => {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.2);

  React.useEffect(() => {
    if (user?.profile?.level > 1) {
      // Subtle glow animation for leveled users
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 2000 }),
          withTiming(0.2, { duration: 2000 })
        ),
        -1,
        true
      );
    }
  }, [user?.profile?.level]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getLevelColor = (level: number): string => {
    if (level >= 10) return '#FFD700'; // Gold
    if (level >= 7) return '#C0C0C0'; // Silver
    if (level >= 4) return '#CD7F32'; // Bronze
    return '#3B82F6'; // Blue
  };

  return (
    <AnimatedTouchableOpacity
      style={[styles.profileChipContainer, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      accessibilityLabel="Profile"
      accessibilityRole="button"
    >
      <Animated.View style={[
        styles.profileChip,
        styles.userProfileChip,
        { shadowColor: '#0021A5' },
        animatedGlowStyle
      ]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user ? getInitials(user.displayName) : 'U'}
          </Text>
        </View>
        
        {/* Level Badge */}
        {user?.profile?.level && user.profile.level > 1 && (
          <View style={[
            styles.levelBadge,
            { backgroundColor: getLevelColor(user.profile.level) }
          ]}>
            <Text style={styles.levelBadgeText}>{user.profile.level}</Text>
          </View>
        )}
      </Animated.View>
    </AnimatedTouchableOpacity>
  );
};

// Enhanced Icon Button
const IconButton = ({ 
  icon, 
  onPress, 
  accessibilityLabel,
  glowColor = Colors.primary
}: { 
  icon: React.ReactNode; 
  onPress: () => void; 
  accessibilityLabel: string;
  glowColor?: string;
}) => {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.92, { duration: 100 });
    glowOpacity.value = withTiming(0.3, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
    glowOpacity.value = withTiming(0, { duration: 200 });
  };

  return (
    <AnimatedTouchableOpacity
      style={[styles.iconButtonContainer, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Animated.View style={[
        styles.iconButton,
        { shadowColor: glowColor },
        animatedGlowStyle
      ]}>
        {icon}
      </Animated.View>
    </AnimatedTouchableOpacity>
  );
};

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
    
    // Open sidebar for authenticated users
    setShowProfileSidebar(true);
  };

  const handleProfileLongPress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    
    setShowProfileSidebar(true);
  };

  const handleSearchPress = () => {
    triggerHaptics();
    console.log('Search pressed');
  };

  const handleNotificationsPress = () => {
    triggerHaptics();
    setShowNotificationCenter(true);
  };

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <View style={styles.leftSection}>
            <ProfileAvatar 
              user={user} 
              onPress={handleProfilePress}
            />
            
            <View style={styles.logoContainer}>
              <Image
                source={require('../src/assets/images/image.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <View style={styles.logoGlow} />
            </View>
          </View>

          {title && (
            <Text style={styles.title}>{title}</Text>
          )}

          <View style={styles.rightSection}>
            {showSearch && (
              <IconButton
                icon={<Search size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />}
                onPress={handleSearchPress}
                accessibilityLabel="Search"
              />
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(229, 231, 235, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 64,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  profileChipContainer: {
    position: 'relative',
  },
  profileChip: {
    borderRadius: 24,
    padding: 3,
    position: 'relative',
  },
  userProfileChip: {
    borderWidth: 2,
    borderColor: 'rgba(0, 33, 165, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  guestProfileChip: {
    borderWidth: 2,
    borderColor: 'rgba(156, 163, 175, 0.4)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.semantic.tabInactive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  guestAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    zIndex: 2,
  },
  logoGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 33, 165, 0.1)',
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    textAlign: 'center',
    flex: 1,
    letterSpacing: 0.3,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'flex-end',
    flex: 1,
  },
  iconButtonContainer: {
    position: 'relative',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
});