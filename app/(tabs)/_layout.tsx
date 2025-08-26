import React from 'react';
import { Tabs } from 'expo-router';
import { Home as HomeIcon, Grid3X3, MessageCircle, Gift, Zap } from 'lucide-react-native';
import { TouchableOpacity, View, StyleSheet, Platform, Text } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  interpolate,
  withRepeat,
  withSequence
} from 'react-native-reanimated';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Enhanced Tab Icon Component
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
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.15, { damping: 15 });
      glowOpacity.value = withTiming(0.3, { duration: 200 });
    } else {
      scale.value = withSpring(1, { damping: 15 });
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  return (
    <Animated.View style={[styles.tabIconContainer, animatedStyle]}>
      <Animated.View style={[
        styles.tabIconGlow,
        { shadowColor: color },
        animatedGlowStyle
      ]}>
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
      </Animated.View>
    </Animated.View>
  );
};

// Custom Tab Button for enhanced interaction
const CustomTabButton = ({ 
  children, 
  onPress, 
  accessibilityState 
}: { 
  children: React.ReactNode; 
  onPress: () => void; 
  accessibilityState?: any;
}) => {
  const scale = useSharedValue(1);
  const focused = accessibilityState?.selected;

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchableOpacity
      style={[styles.customTabButton, focused && styles.focusedTabButton]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </AnimatedTouchableOpacity>
  );
};

// Post Task Tab Button Component
const PostTaskButton = ({ focused }: { focused: boolean }) => {
  const router = useRouter();
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    // Continuous pulse animation
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );

    if (focused) {
      scale.value = withSpring(1.1, { damping: 15 });
      glowOpacity.value = withTiming(0.6, { duration: 300 });
    } else {
      scale.value = withSpring(1, { damping: 15 });
      glowOpacity.value = withTiming(0.4, { duration: 300 });
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

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
    <AnimatedTouchableOpacity
      style={[styles.postTaskButton, animatedStyle]}
      onPress={handlePress}
      activeOpacity={0.9}
      accessibilityLabel="Post Task"
      accessibilityRole="button"
    >
      <Animated.View style={[styles.postTaskIconContainer, animatedGlowStyle]}>
        <Animated.View style={[styles.postTaskIconWrapper, animatedPulseStyle]}>
          <LinearGradient
            colors={['#0047FF', '#0021A5', '#FA4616']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            locations={[0, 0.6, 1]}
            style={styles.postTaskGradient}
          >
            <Zap size={28} color={Colors.white} strokeWidth={2.5} fill={Colors.white} />
          </LinearGradient>
          
          {/* Animated Pulse Ring */}
          <View style={styles.pulseRing} />
        </Animated.View>
      </Animated.View>
      <Text style={[
        styles.postTaskLabel,
        { 
          color: focused ? '#0021A5' : '#9CA3AF', 
          fontWeight: focused ? '700' : '600',
          fontSize: focused ? 13 : 12
        }
      ]}>
        Post Task
      </Text>
    </AnimatedTouchableOpacity>
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
            height: 92 + insets.bottom,
            paddingBottom: insets.bottom + 4,
            paddingTop: 16,
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
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 6,
            letterSpacing: 0.3,
          },
          tabBarButton: (props) => <CustomTabButton {...props} />,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
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
            title: 'Tasks',
            tabBarIcon: ({ size, color, focused }) => (
              <TabIcon 
                IconComponent={Grid3X3} 
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
            title: 'Post Task',
            tabBarButton: PostTaskTabButton,
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: 'Chats',
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
            title: 'Rewards',
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
  customTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  focusedTabButton: {
    backgroundColor: 'rgba(0, 33, 165, 0.08)',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconGlow: {
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
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
  postTaskIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  postTaskGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(0, 33, 165, 0.3)',
  },
  postTaskLabel: {
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});