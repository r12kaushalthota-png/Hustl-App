import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, MapPin } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay, 
  withTiming, 
  withRepeat,
  withSequence,
  interpolate,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { BrandingUtils } from '@/constants/Branding';
import HustlLogo from '@/components/HustlLogo';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(40);
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.9);

  useEffect(() => {
    // Staggered entrance animations
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoScale.value = withSpring(1, { damping: 15, stiffness: 300 });

    titleOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    titleTranslateY.value = withDelay(400, withSpring(0, { damping: 15 }));

    contentOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
    contentTranslateY.value = withDelay(800, withSpring(0, { damping: 15 }));

    buttonOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));
    buttonScale.value = withDelay(1200, withSpring(1, { damping: 15 }));
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const animatedTitleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));

  const handleGetStarted = () => {
    router.push('/(onboarding)/auth');
  };

  const handleTerms = () => {
    router.push('/(onboarding)/terms');
  };

  const handlePrivacy = () => {
    router.push('/(onboarding)/privacy');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Gradient background matching screenshot */}
      <LinearGradient
        colors={BrandingUtils.getBrandGradient('welcome')}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.backgroundGradient}
      />

      <View style={styles.content}>
        {/* Logo Section */}
        <Animated.View style={[styles.logoSection, animatedLogoStyle]}>
          <HustlLogo 
            size="xlarge" 
            animated={true} 
            showGlow={true}
          />
        </Animated.View>

        {/* Welcome Text */}
        <Animated.View style={[styles.welcomeSection, animatedTitleStyle]}>
          <Text style={styles.welcomeTitle}>Welcome to Hustl!</Text>
          <Text style={styles.welcomeTagline}>
            Connect. Collaborate. Get things done.
          </Text>
          <Text style={styles.welcomeDescription}>
            Join your campus community for tasks, food pickups, study sessions, and more.
          </Text>
        </Animated.View>

        {/* Bottom Action Section */}
        <Animated.View style={[styles.bottomSection, animatedButtonStyle]}>
          <TouchableOpacity 
            style={styles.primaryButtonContainer}
            onPress={handleGetStarted}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={BrandingUtils.getBrandGradient('button')}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <ChevronRight size={20} color={Colors.white} strokeWidth={2} />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={handleTerms}>
              <Text style={styles.legalText}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>•</Text>
            <TouchableOpacity onPress={handlePrivacy}>
              <Text style={styles.legalText}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 60,
  },
  welcomeSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  welcomeTitle: {
    fontSize: 42,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: -0.5,
  },
  welcomeTagline: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  welcomeDescription: {
    fontSize: 18,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 26,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 24,
  },
  primaryButtonContainer: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 16,
    minHeight: 60,
  },
  primaryButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  legalText: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontWeight: '500',
  },
  legalSeparator: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.7,
  },
});