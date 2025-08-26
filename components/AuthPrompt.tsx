import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Zap, Star, Shield, ArrowRight } from 'lucide-react-native';
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

const { width } = Dimensions.get('window');

interface AuthPromptProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function AuthPrompt({ visible, onClose, title, message }: AuthPromptProps) {
  const router = useRouter();
  
  // Animation values
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const iconRotate = useSharedValue(0);
  const glowPulse = useSharedValue(0);
  const shimmer = useSharedValue(-1);

  React.useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      
      iconRotate.value = withRepeat(
        withTiming(360, { duration: 8000 }),
        -1,
        false
      );

      glowPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0, { duration: 1500 })
        ),
        -1,
        true
      );

      shimmer.value = withRepeat(
        withTiming(1, { duration: 2000 }),
        -1,
        false
      );
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.8, { duration: 200 });
      iconRotate.value = 0;
      glowPulse.value = 0;
      shimmer.value = -1;
    }
  }, [visible]);

  const animatedModalStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotate.value}deg` }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(glowPulse.value, [0, 1], [0.2, 0.4]);
    return { shadowOpacity };
  });

  const animatedShimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmer.value, [0, 1], [-100, width + 100]);
    return { transform: [{ translateX }] };
  });

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleAuth = () => {
    triggerHaptics();
    onClose();
    router.push('/(onboarding)/auth');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.modal, animatedModalStyle]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={18} color={Colors.semantic.tabInactive} strokeWidth={2} />
          </TouchableOpacity>
          
          <View style={styles.content}>
            {/* Animated Icon */}
            <Animated.View style={[styles.iconContainer, animatedGlowStyle]}>
              <View style={styles.iconWrapper}>
                <LinearGradient
                  colors={['#0047FF', '#0021A5', '#FA4616']}
                  style={styles.iconGradient}
                >
                  <Animated.View style={animatedIconStyle}>
                    <Zap size={32} color={Colors.white} strokeWidth={2.5} fill={Colors.white} />
                  </Animated.View>
                </LinearGradient>
                
                {/* Floating decorative elements */}
                <View style={styles.decorativeElement1}>
                  <Star size={12} color={Colors.secondary} strokeWidth={2} fill={Colors.secondary} />
                </View>
                <View style={styles.decorativeElement2}>
                  <Shield size={10} color={Colors.primary} strokeWidth={2} />
                </View>
              </View>
            </Animated.View>
            
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            
            <View style={styles.buttons}>
              <AnimatedTouchableOpacity 
                style={styles.authButton} 
                onPress={handleAuth}
                activeOpacity={0.9}
              >
                <Animated.View style={[styles.authButtonContainer, animatedGlowStyle]}>
                  <LinearGradient
                    colors={['#0047FF', '#0021A5']}
                    style={styles.authButtonGradient}
                  >
                    <Animated.View style={[styles.shimmerOverlay, animatedShimmerStyle]} />
                    <Zap size={18} color={Colors.white} strokeWidth={2} fill={Colors.white} />
                    <Text style={styles.authButtonText}>Get Started</Text>
                    <ArrowRight size={16} color={Colors.white} strokeWidth={2.5} />
                  </LinearGradient>
                </Animated.View>
              </AnimatedTouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 28,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  content: {
    padding: 40,
    alignItems: 'center',
    gap: 24,
  },
  iconContainer: {
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    position: 'relative',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  decorativeElement1: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  decorativeElement2: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttons: {
    width: '100%',
  },
  authButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  authButtonContainer: {
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 12,
  },
  authButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ skewX: '-20deg' }],
  },
  authButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },
});