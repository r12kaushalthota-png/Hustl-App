import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  SafeAreaView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  X, 
  User, 
  Star, 
  Shield, 
  CreditCard,
  ChevronRight,
  Settings,
  HelpCircle,
  LogOut
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  runOnJS,
  interpolate
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { GamificationRepo } from '@/lib/gamificationRepo';

const { width, height } = Dimensions.get('window');

interface GlobalProfilePanelProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

const menuItems = [
  {
    icon: <User size={20} color={Colors.semantic.bodyText} strokeWidth={2} />,
    title: 'Profile Information',
    route: '/profile/edit',
    showChevron: true,
  },
  {
    icon: <Star size={20} color={Colors.semantic.bodyText} strokeWidth={2} />,
    title: 'Reviews',
    route: '/profile/reviews',
    showChevron: true,
  },
  {
    icon: <Settings size={20} color={Colors.semantic.bodyText} strokeWidth={2} />,
    title: 'Settings',
    route: '/profile/settings',
    showChevron: true,
  },
  {
    icon: <HelpCircle size={20} color={Colors.semantic.bodyText} strokeWidth={2} />,
    title: 'Help & Support',
    route: '/profile/help',
    showChevron: true,
  },
];

export default function GlobalProfilePanel({ visible, onClose, onNavigate }: GlobalProfilePanelProps) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  
  // Animation values
  const translateX = useSharedValue(width);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Slide in from right
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      overlayOpacity.value = withTiming(1, { duration: 300 });
    } else {
      // Slide out to right
      translateX.value = withTiming(width, { duration: 250 });
      overlayOpacity.value = withTiming(0, { duration: 250 });
    }
  }, [visible]);

  const animatedPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
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

  const handleClose = () => {
    triggerHaptics();
    onClose();
  };

  const handleMenuPress = (route: string) => {
    triggerHaptics();
    onClose();
    onNavigate(route);
  };

  const handleLogout = async () => {
    triggerHaptics();
    onClose();
    await logout();
    onNavigate('/(onboarding)/splash');
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

  const formatCredits = (credits: number): string => {
    return `${credits} credit${credits !== 1 ? 's' : ''}`;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      {/* Overlay */}
      <Animated.View style={[styles.overlay, animatedOverlayStyle]}>
        <TouchableOpacity 
          style={styles.overlayTouchable}
          onPress={handleClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Panel */}
      <Animated.View style={[styles.panel, animatedPanelStyle]}>
        <SafeAreaView style={styles.panelContent}>
          {/* Header with Gradient */}
          <LinearGradient
            colors={['#8B5CF6', '#EC4899', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleClose}
              accessibilityLabel="Close profile panel"
              accessibilityRole="button"
            >
              <X size={24} color={Colors.white} strokeWidth={2} />
            </TouchableOpacity>

            {/* Profile Header Content */}
            <View style={styles.profileHeaderContent}>
              {/* Avatar */}
              <View style={styles.avatarContainer}>
                {user?.profile?.avatar_url ? (
                  <Image 
                    source={{ uri: user.profile.avatar_url }} 
                    style={styles.avatar} 
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {getInitials(user?.displayName || 'User')}
                    </Text>
                  </View>
                )}
              </View>

              {/* User Info */}
              <Text style={styles.userName}>
                {user?.displayName || 'Guest User'}
              </Text>
              
              <View style={styles.userDetails}>
                <Text style={styles.university}>
                  {user?.university || 'University of Florida'}
                </Text>
                <Text style={styles.userType}>Student</Text>
                <Text style={styles.userStatus}>New Hustler</Text>
              </View>

              {/* Credits Display */}
              <View style={styles.creditsContainer}>
                <Text style={styles.creditsAmount}>
                  ${((user?.profile?.credits || 0) / 100).toFixed(0)}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Panel Body */}
          <ScrollView 
            style={styles.panelBody}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          >
            {/* Verified Student Badge */}
            <View style={styles.verifiedSection}>
              <View style={styles.verifiedBadge}>
                <View style={styles.verifiedIconContainer}>
                  <Shield size={16} color={Colors.semantic.successAlert} strokeWidth={2} />
                </View>
                <View style={styles.verifiedTextContainer}>
                  <Text style={styles.verifiedTitle}>Verified Student</Text>
                  <Text style={styles.verifiedSubtitle}>Full access to all features</Text>
                </View>
              </View>
            </View>

            {/* Credits Card */}
            <View style={styles.creditsSection}>
              <View style={styles.creditsCard}>
                <View style={styles.creditsIconContainer}>
                  <CreditCard size={16} color={Colors.primary} strokeWidth={2} />
                </View>
                <Text style={styles.creditsText}>
                  {formatCredits(user?.profile?.credits || 0)}
                </Text>
              </View>
            </View>

            {/* Menu Items */}
            <View style={styles.menuSection}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => handleMenuPress(item.route)}
                  activeOpacity={0.7}
                  accessibilityLabel={item.title}
                  accessibilityRole="button"
                >
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuItemIcon}>
                      {item.icon}
                    </View>
                    <Text style={styles.menuItemText}>{item.title}</Text>
                  </View>
                  {item.showChevron && (
                    <ChevronRight size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              ))}

              {/* Logout */}
              <TouchableOpacity
                style={[styles.menuItem, styles.logoutItem]}
                onPress={handleLogout}
                activeOpacity={0.7}
                accessibilityLabel="Logout"
                accessibilityRole="button"
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuItemIcon}>
                    <LogOut size={20} color={Colors.semantic.errorAlert} strokeWidth={2} />
                  </View>
                  <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
                </View>
                <ChevronRight size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: width * 0.85,
    maxWidth: 320,
    backgroundColor: Colors.semantic.screen,
    shadowColor: '#000',
    shadowOffset: { width: -8, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  panelContent: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  profileHeaderContent: {
    alignItems: 'center',
    paddingTop: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userDetails: {
    alignItems: 'center',
    gap: 2,
  },
  university: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  userType: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  userStatus: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.8,
    textAlign: 'center',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  creditsContainer: {
    position: 'absolute',
    top: 20,
    right: 60,
  },
  creditsAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  panelBody: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  verifiedSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.successAlert + '15',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.successAlert + '30',
  },
  verifiedIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.semantic.successAlert + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  verifiedTextContainer: {
    flex: 1,
  },
  verifiedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 2,
  },
  verifiedSubtitle: {
    fontSize: 13,
    color: Colors.semantic.tabInactive,
  },
  creditsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  creditsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  creditsIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  creditsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  menuSection: {
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
    backgroundColor: Colors.semantic.card,
    marginBottom: 1,
  },
  logoutItem: {
    marginTop: 20,
    borderBottomWidth: 0,
    borderRadius: 12,
    backgroundColor: Colors.semantic.errorAlert + '10',
    borderWidth: 1,
    borderColor: Colors.semantic.errorAlert + '20',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.semantic.bodyText,
    flex: 1,
  },
  logoutText: {
    color: Colors.semantic.errorAlert,
    fontWeight: '600',
  },
});