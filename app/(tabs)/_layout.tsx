import React from 'react';
import { Tabs } from 'expo-router';
import { PhoneIncoming as HomeIcon, List as ListIcon, Zap } from 'lucide-react-native';
import { TouchableOpacity, View, StyleSheet, Platform, Text } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Simple Tab Icon Component
const TabIcon = ({ 
  IconComponent, 
  size, 
  color, 
  focused 
}: { 
  IconComponent: any; 
  size: number; 
  color: string; 
  focused: boolean;
}) => {
  return (
    <View style={styles.tabIconContainer}>
      <View style={[
        styles.tabIconBackground,
        focused && { backgroundColor: color + '15' }
      ]}>
        <IconComponent 
          size={size} 
          color={color} 
          strokeWidth={focused ? 2.5 : 2}
        />
      </View>
    </View>
  );
};

// Post Task Tab Button Component
const PostTaskButton = ({ focused }: { focused: boolean }) => {
  const router = useRouter();

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    router.push('/(tabs)/post');
  };

  return (
    <TouchableOpacity
      style={styles.postTaskButton}
      onPress={handlePress}
      activeOpacity={0.9}
      accessibilityLabel="Post Task"
      accessibilityRole="button"
    >
      <View style={styles.postTaskIconContainer}>
        <LinearGradient
          colors={['#0047FF', '#0021A5', '#FA4616']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.6, 1]}
          style={styles.postTaskGradient}
        >
          <Zap size={28} color={Colors.white} strokeWidth={2.5} fill={Colors.white} />
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
};

// Custom tab bar button for Post Task
const PostTaskTabButton = (props: any) => {
  return (
    <View style={styles.postTaskTabContainer}>
      <PostTaskButton focused={props.accessibilityState?.selected || false} />
    </View>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: 'rgba(229, 231, 235, 0.2)',
            borderTopWidth: 0.5,
            height: 64 + insets.bottom,
            paddingBottom: insets.bottom + 8,
            paddingTop: 8,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
          },
          tabBarActiveTintColor: '#0021A5',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ size, color, focused }) => (
              <TabIcon 
                IconComponent={HomeIcon} 
                size={size} 
                color={color} 
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            tabBarIcon: ({ size, color, focused }) => (
              <TabIcon 
                IconComponent={ListIcon} 
                size={size} 
                color={color} 
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="post"
          options={{
            tabBarButton: PostTaskTabButton,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconBackground: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postTaskTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  postTaskButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  postTaskIconContainer: {
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  postTaskGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});