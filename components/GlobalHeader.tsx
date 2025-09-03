import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, TextInput, Modal, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Bell, Sparkles, ChevronDown, X, Wallet, CreditCard, CircleHelp as HelpCircle, Flag, MessageSquare, Settings, MapPin, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  withRepeat,
  withSequence,
  interpolate
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/features/notifications/useNotifications';
import NotificationBell from './NotificationBell';
import NotificationCenterModal from './NotificationCenterModal';
import ProfileSidebar from './ProfileSidebar';

const { width } = Dimensions.get('window');

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Search suggestions data
const searchSuggestions = [
  { id: 'help', title: 'Help & Support', subtitle: 'Get assistance with the app', route: '/profile/help', icon: HelpCircle },
  { id: 'report', title: 'Report Issue', subtitle: 'Report a problem or bug', route: '/profile/help', icon: Flag },
  { id: 'feedback', title: 'Send Feedback', subtitle: 'Share your thoughts with us', route: '/profile/help', icon: MessageSquare },
  { id: 'settings', title: 'Settings', subtitle: 'Manage your preferences', route: '/profile/settings', icon: Settings },
  { id: 'profile', title: 'Profile', subtitle: 'View and edit your profile', route: '/profile', icon: Settings },
  { id: 'tasks', title: 'My Tasks', subtitle: 'View your posted tasks', route: '/profile/my-tasks', icon: Settings },
  { id: 'history', title: 'Task History', subtitle: 'View completed tasks', route: '/profile/task-history', icon: Settings },
];

// Enhanced Profile Avatar with Level Badge
const ProfileAvatar = ({ user, isGuest, onPress }: { 
  user: any; 
  isGuest: boolean; 
  onPress: () => void;
}) => {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.2);

  React.useEffect(() => {
    if (!isGuest && user?.profile?.level > 1) {
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
  }, [isGuest, user?.profile?.level]);

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
        isGuest ? styles.guestProfileChip : styles.userProfileChip,
        !isGuest && { shadowColor: '#0021A5' },
        animatedGlowStyle
      ]}>
        <View style={isGuest ? styles.guestAvatar : styles.avatar}>
          <Text style={isGuest ? styles.guestAvatarText : styles.avatarText}>
            {user ? getInitials(user.displayName) : (isGuest ? '?' : 'U')}
          </Text>
        </View>
        
        {/* Level Badge */}
        {!isGuest && user?.profile?.level && user.profile.level > 1 && (
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

// Search Modal Component
const SearchModal = ({ 
  visible, 
  onClose 
}: { 
  visible: boolean; 
  onClose: () => void;
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState(searchSuggestions);

  React.useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = searchSuggestions.filter(suggestion =>
        suggestion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        suggestion.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions(searchSuggestions);
    }
  }, [searchQuery]);

  const handleSuggestionPress = (suggestion: any) => {
    onClose();
    setSearchQuery('');
    router.push(suggestion.route);
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.searchOverlay}>
        <View style={styles.searchModal}>
          <View style={styles.searchHeader}>
            <View style={styles.searchInputContainer}>
              <Search size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search for help, settings, or features..."
                placeholderTextColor={Colors.semantic.tabInactive}
                autoFocus
              />
            </View>
            <TouchableOpacity style={styles.searchCloseButton} onPress={handleClose}>
              <X size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
            {filteredSuggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion.id}
                style={styles.searchSuggestion}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <View style={styles.suggestionIcon}>
                  <suggestion.icon size={20} color={Colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                  <Text style={styles.suggestionSubtitle}>{suggestion.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Campus Menu Modal Component
const CampusMenuModal = ({ 
  visible, 
  onClose 
}: { 
  visible: boolean; 
  onClose: () => void;
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const menuItems = [
    {
      id: 'wallet',
      title: 'Wallet',
      subtitle: user?.profile ? `$${((user.profile.credits || 0) / 100).toFixed(2)} available` : '$0.00 available',
      icon: Wallet,
      route: '/(tabs)/referrals'
    },
    {
      id: 'credits',
      title: 'Credits',
      subtitle: user?.profile ? `${user.profile.credits || 0} credits` : '0 credits',
      icon: CreditCard,
      route: '/(tabs)/referrals'
    },
    {
      id: 'campus',
      title: 'University of Florida',
      subtitle: 'Gainesville, FL',
      icon: MapPin,
      route: '/profile/settings'
    },
  ];

  const handleMenuPress = (route: string) => {
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.menuOverlay}
        onPress={onClose}
        activeOpacity={1}
      >
        <View style={[styles.menuModal, { paddingTop: insets.top + 80 }]}>
          <View style={styles.menuContent}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleMenuPress(item.route)}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemIcon}>
                  <item.icon size={20} color={Colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                </View>
                <ChevronRight size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
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
  title,
}: GlobalHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const { unreadCount } = useNotifications();

  const [showProfileSidebar, setShowProfileSidebar] = React.useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = React.useState(false);
  const [showSearchModal, setShowSearchModal] = React.useState(false);
  const [showCampusMenu, setShowCampusMenu] = React.useState(false);

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

  const handleSearchPress = () => {
    triggerHaptics();
    setShowSearchModal(true);
  };

  const handleNotificationsPress = () => {
    triggerHaptics();
    setShowNotificationCenter(true);
  };

  const handleLogoPress = () => {
    triggerHaptics();
    setShowCampusMenu(true);
  };

  if (isGuest) {
    return (
      <>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.content}>
            <View style={styles.leftSection}>
              <ProfileAvatar 
                user={user} 
                isGuest={isGuest} 
                onPress={handleProfilePress}
              />
              
              <TouchableOpacity 
                style={styles.logoChip}
                onPress={handleLogoPress}
                activeOpacity={0.7}
                accessibilityLabel="Campus menu"
                accessibilityRole="button"
              >
                <View style={styles.logoContainer}>
                  <Image
                    source={require('../src/assets/images/image.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
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
            </View>
          </View>
        </View>

        <SearchModal
          visible={showSearchModal}
          onClose={() => setShowSearchModal(false)}
        />
      </>
    );
  }

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <View style={styles.leftSection}>
            <ProfileAvatar 
              user={user} 
              isGuest={isGuest} 
              onPress={handleProfilePress}
            />
            
            <TouchableOpacity 
              style={styles.logoChip}
              onPress={handleLogoPress}
              activeOpacity={0.7}
              accessibilityLabel="Campus menu"
              accessibilityRole="button"
            >
              <View style={styles.logoContainer}>
                <Image
                  source={require('../src/assets/images/image.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>
          </View>

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

      {/* Search Modal */}
      <SearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />

      {/* Campus Menu Modal */}
      <CampusMenuModal
        visible={showCampusMenu}
        onClose={() => setShowCampusMenu(false)}
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
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 28,
    height: 28,
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
  searchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 100,
  },
  searchModal: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    maxHeight: '70%',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.muted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.inputText,
  },
  searchCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResults: {
    maxHeight: 400,
  },
  searchSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 231, 235, 0.3)',
    gap: 12,
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 2,
  },
  suggestionSubtitle: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuModal: {
    paddingHorizontal: 20,
  },
  menuContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 231, 235, 0.3)',
    gap: 12,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
  },
});