import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';

interface NotificationBellProps {
  unreadCount: number;
  onPress: () => void;
}

export default function NotificationBell({ unreadCount, onPress }: NotificationBellProps) {
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
    triggerHaptics();
    onPress();
  };

  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();
  const showBadge = unreadCount > 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      accessibilityLabel={`Notifications. ${unreadCount} unread`}
      accessibilityRole="button"
    >
      <View style={[
        styles.iconContainer,
        { shadowColor: showBadge ? Colors.secondary : Colors.primary }
      ]}>
        <Bell 
          size={22} 
          color={showBadge ? Colors.primary : Colors.semantic.tabInactive} 
          strokeWidth={showBadge ? 2.5 : 2} 
        />
        
        {showBadge && (
          <View style={styles.badge}>
            <LinearGradient
              colors={['#FF5A1F', '#FA4616']}
              style={styles.badgeGradient}
            >
              <Text style={styles.badgeText}>{displayCount}</Text>
            </LinearGradient>
          </View>
        )}
      </View>
    </TouchableOpacity>
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