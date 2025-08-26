import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, CircleAlert as AlertCircle, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  runOnJS,
  withSequence,
  interpolate
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';

const { width } = Dimensions.get('window');

interface ToastProps {
  visible: boolean;
  message: string;
  onHide: () => void;
  duration?: number;
  type?: 'success' | 'error';
}

export default function Toast({ 
  visible, 
  message, 
  onHide, 
  duration = 3000,
  type = 'success' 
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  useEffect(() => {
    if (visible) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Trigger haptics on show
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(
            type === 'success' 
              ? Haptics.NotificationFeedbackType.Success 
              : Haptics.NotificationFeedbackType.Error
          );
        } catch (error) {
          // Haptics not available, continue silently
        }
      }

      // Show animation
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 300 });
      
      // Icon animation with delay
      setTimeout(() => {
        iconScale.value = withSequence(
          withSpring(1.2, { damping: 10 }),
          withSpring(1, { damping: 15 })
        );
        glowOpacity.value = withTiming(0.3, { duration: 300 });
      }, 200);

      // Auto-hide after duration
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    } else {
      hideToast();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible]);

  const hideToast = () => {
    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(-100, { duration: 200 }, () => {
      runOnJS(onHide)();
    });
    iconScale.value = 0;
    glowOpacity.value = 0;
  };

  if (!visible) return null;

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          colors: ['#10B981', '#059669'],
          icon: <Check size={18} color={Colors.white} strokeWidth={2.5} />,
          shadowColor: '#10B981'
        };
      case 'error':
        return {
          colors: ['#EF4444', '#DC2626'],
          icon: <AlertCircle size={18} color={Colors.white} strokeWidth={2.5} />,
          shadowColor: '#EF4444'
        };
      default:
        return {
          colors: ['#3B82F6', '#2563EB'],
          icon: <Info size={18} color={Colors.white} strokeWidth={2.5} />,
          shadowColor: '#3B82F6'
        };
    }
  };

  const config = getToastConfig();

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          top: insets.top + 16,
          shadowColor: config.shadowColor
        }, 
        animatedStyle,
        animatedGlowStyle
      ]}
    >
      <LinearGradient
        colors={config.colors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
            {config.icon}
          </Animated.View>
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  message: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});