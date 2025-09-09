import React from 'react';
import { Tabs } from 'expo-router';
import { 
  Home, 
  List, 
  Zap, 
  MessageCircle, 
  Gift 
} from 'lucide-react-native';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Tab Icon Component
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
      <IconComponent 
        size={size} 
        color={color} 
        strokeWidth={focused ? 2.5 : 2}
      />
    </View>
  );
};

// Lightning Action Button Component
const LightningActionButton = ({ focused }: { focused: boolean }) => {
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
      style={styles.lightningButton}
      onPress={handlePress}
      activeOpacity={0.9}
      accessibilityLabel="Post Task"
      accessibilityRole="button"
    >
      <LinearGradient
        colors={['#3B82F6', '#1D4ED8']}
        style={styles.lightningGradient}
      >
        <Zap size={28} color={Colors.white} strokeWidth={2.5} fill={Colors.white} />
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Custom tab bar button for Lightning Action
const LightningTabButton = (props: any) => {
  return (
    <View style={styles.lightningTabContainer}>
      <LightningActionButton focused={props.accessibilityState?.selected || false} />
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
            backgroundColor: Colors.white,
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
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ size, color, focused }) => (
              <TabIcon 
                IconComponent={Home} 
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
                IconComponent={List} 
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
            tabBarButton: LightningTabButton,
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            tabBarIcon: ({ size, color, focused }) => (
              <TabIcon 
                IconComponent={MessageCircle} 
                size={size} 
                color={color} 
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="referrals"
          options={{
            tabBarIcon: ({ size, color, focused }) => (
              <TabIcon 
                IconComponent={Gift} 
                size={size} 
                color={color} 
                focused={focused}
              />
            ),
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
    width: 44,
    height: 44,
  },
  lightningTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  lightningButton: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  lightningGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});