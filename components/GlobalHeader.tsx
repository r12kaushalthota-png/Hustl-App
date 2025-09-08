import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';

interface GlobalHeaderProps {
  title?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  onSearchPress?: () => void;
  onNotificationPress?: () => void;
}

export default function GlobalHeader({ 
  title = 'Hustl',
  showSearch = false,
  showNotifications = true,
  onSearchPress,
  onNotificationPress
}: GlobalHeaderProps) {
  const insets = useSafeAreaInsets();

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleSearchPress = () => {
    triggerHaptics();
    onSearchPress?.();
  };

  const handleNotificationPress = () => {
    triggerHaptics();
    onNotificationPress?.();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Left side - could add user avatar or back button */}
        <View style={styles.leftSection}>
          {/* Placeholder for future left content */}
        </View>

        {/* Center - Title */}
        <View style={styles.centerSection}>
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* Right side - Action buttons */}
        <View style={styles.rightSection}>
          {showSearch && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSearchPress}
              accessibilityLabel="Search"
              accessibilityRole="button"
            >
              <Search size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
            </TouchableOpacity>
          )}
          
          {showNotifications && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleNotificationPress}
              accessibilityLabel="Notifications"
              accessibilityRole="button"
            >
              <Bell size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(229, 231, 235, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 64,
  },
  leftSection: {
    width: 40,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 80,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    textAlign: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.4)',
  },
});