import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Bell } from 'lucide-react-native';
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

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface NotificationBellProps {
  unreadCount: number;
  onPress: () => void;
}

export default function NotificationBell({ unreadCount, onPress }: NotificationBellProps) {
  const scale = useSharedValue(1);
  const bellRotation = useSharedValue(0);
  const badgePulse = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (unreadCount > 0) {
      // Bell shake animation for new notifications
      bellRotation.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 100 }),
          withTiming(8, { duration: 100 }),
          withTiming(-8, { duration: 100 }),
          withTiming(0, { duration: 100 })
        ),
        -1,
        false
      );

      // Badge pulse animation
      badgePulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    }
  }, [unreadCount]);

  const animatedBellStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${bellRotation.value}deg` }
    ],
  }));

  const animatedBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgePulse.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
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

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1, { damping: 15 })
    );
    glowOpacity.value = withSequence(
      withTiming(0.4, { duration: 100 }),
      withTiming(0, { duration: 300 })
    );
    triggerHaptics();
    onPress();
  };

  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();
  const showBadge = unreadCount > 0;

  return (
    <AnimatedTouchableOpacity
      style={[styles.container, animatedBellStyle]}
      onPress={handlePress}
      accessibilityLabel={`Notifications. ${unreadCount} unread`}
      accessibilityRole="button"
    >
      <Animated.View style={[
        styles.iconContainer,
        { shadowColor: showBadge ? Colors.secondary : Colors.primary },
        animatedGlowStyle
      ]}>
        <Bell 
          size={22} 
          color={showBadge ? Colors.primary : Colors.semantic.tabInactive} 
          strokeWidth={showBadge ? 2.5 : 2} 
        />
        
        {showBadge && (
          <Animated.View style={[styles.badge, animatedBadgeStyle]}>
            <LinearGradient
              colors={['#FF5A1F', '#FA4616']}
              style={styles.badgeGradient}
            >
              <Text style={styles.badgeText}>{displayCount}</Text>
            </LinearGradient>
          </Animated.View>
        )}
      </Animated.View>
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  iconContainer: {
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  badgeGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});