import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { User, X, Zap, Shield } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  withSequence,
  interpolate,
  withRepeat
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

// Enhanced Brand Logo
const BrandLogo = () => {
  const glowAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);

  React.useEffect(() => {
    glowAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );

    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(glowAnimation.value, [0, 1], [0.3, 0.6]);
    return { shadowOpacity };
  });

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  return (
    <Animated.View style={[styles.logoContainer, animatedGlowStyle]}>
      <Animated.View style={[styles.logoWrapper, animatedPulseStyle]}>
        <LinearGradient
          colors={['#0047FF', '#0021A5']}
          style={styles.logoGradient}
        >
          <Zap size={32} color={Colors.white} strokeWidth={2.5} fill={Colors.white} />
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
};

export default function AuthPrompt({ visible, onClose, title, message }: AuthPromptProps) {
  const router = useRouter();

  const handleLogin = () => {
    onClose();
    router.push('/(onboarding)/auth');
  };

  const handleSignUp = () => {
    onClose();
    router.push('/(onboarding)/auth');
  };

  // Animation values
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 15 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.modal, animatedStyle]}>
          {/* Premium Background */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.98)', 'rgba(248, 250, 252, 0.95)']}
            style={styles.modalGradient}
          >
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
          </TouchableOpacity>
          
          <View style={styles.content}>
            <BrandLogo />
            
            <View style={styles.textContainer}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
              
              <View style={styles.premiumBadge}>
                <Shield size={16} color={Colors.white} strokeWidth={2} />
                <Text style={styles.premiumBadgeText}>Premium Experience</Text>
              </View>
            </View>
            
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <LinearGradient
                  colors={['#0047FF', '#0021A5']}
                  style={styles.loginButtonGradient}
                >
                  <Text style={styles.loginButtonText}>Sign In</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
                <View style={styles.signUpButtonContent}>
                  <Text style={styles.signUpButtonText}>Create Account</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
          </LinearGradient>
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
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
  },
  modalGradient: {
    borderRadius: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backdropFilter: 'blur(10px)',
  },
  content: {
    padding: 40,
    alignItems: 'center',
    gap: 32,
  },
  logoContainer: {
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 12,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0021A5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  buttons: {
    width: '100%',
    gap: 16,
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  signUpButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0, 33, 165, 0.3)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    backdropFilter: 'blur(10px)',
  },
  signUpButtonContent: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  signUpButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0021A5',
    letterSpacing: 0.3,
  },
});