import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Zap } from 'lucide-react-native';
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

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface StickyFormFooterProps {
  onSubmit: () => void;
  isSubmitting: boolean;
  isValid: boolean;
  buttonText?: string;
}

export default function StickyFormFooter({ 
  onSubmit, 
  isSubmitting, 
  isValid, 
  buttonText = "Post Task" 
}: StickyFormFooterProps) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.2);
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    if (isValid && !isSubmitting) {
      // Pulse animation when button becomes active
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1200 }),
          withTiming(1, { duration: 1200 })
        ),
        -1,
        true
      );
      
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1200 }),
          withTiming(0.2, { duration: 1200 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = 1;
      glowOpacity.value = 0;
    }
  }, [isValid, isSubmitting]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { scale: pulseScale.value }
    ],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  const handlePressIn = () => {
    if (!isValid || isSubmitting) return;
    scale.value = withTiming(0.98, { duration: 100 });
  };

  const handlePressOut = () => {
    if (!isValid || isSubmitting) return;
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <View style={[
      styles.footer,
      {
        bottom: tabBarHeight + insets.bottom + 12,
      }
    ]}>
      <AnimatedTouchableOpacity
        style={[
          styles.buttonContainer,
          animatedButtonStyle
        ]}
        onPress={onSubmit}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!isValid || isSubmitting}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={buttonText}
      >
        <Animated.View style={[
          styles.button,
          { shadowColor: isValid ? '#0021A5' : '#9CA3AF' },
          animatedGlowStyle
        ]}>
          {isValid && !isSubmitting ? (
            <LinearGradient
              colors={['#0047FF', '#0021A5']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.buttonGradient}
            >
              <Zap size={18} color={Colors.white} strokeWidth={2.5} fill={Colors.white} />
              <Text style={styles.buttonText}>{buttonText}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.disabledButton}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.disabledButtonText}>{buttonText}</Text>
              )}
            </View>
          )}
        </Animated.View>
      </AnimatedTouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    paddingTop: 20,
    paddingBottom: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(229, 231, 235, 0.3)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  buttonContainer: {
    borderRadius: 16,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
    minHeight: 56,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  disabledButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});