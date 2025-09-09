import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, MapPin, Zap } from 'lucide-react-native';
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

const { width, height } = Dimensions.get('window');

// Enhanced logo with Hustl branding
const HustlLogo = () => {
  const glowOpacity = useSharedValue(0.3);
  const pulseScale = useSharedValue(1);
  const rotateAnimation = useSharedValue(0);

  useEffect(() => {
    // Glow animation
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Pulse animation
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Slow rotation
    rotateAnimation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  const animatedRotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateAnimation.value}deg` }],
  }));

  return (
    <View style={styles.logoContainer}>
      {/* Rotating background halo */}
      <Animated.View style={[styles.logoHalo, animatedRotateStyle]} />
      
      {/* Main logo with glow */}
      <Animated.View style={[styles.logoWrapper, animatedGlowStyle]}>
        <View style={styles.logoCircle}>
          <Zap size={60} color={Colors.white} strokeWidth={3} fill={Colors.white} />
        </View>
      </Animated.View>
    </View>
  );
};

// University icons carousel
const UniversityCarousel = () => {
  const translateX = useSharedValue(0);
  
  const universities = [
    { name: 'UF', color: '#0021A5' },
    { name: 'UCF', color: '#FFD700' },
    { name: 'USF', color: '#006747' },
    { name: 'FSU', color: '#782F40' },
  ];

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(-universities.length * 80, { 
        duration: 8000, 
        easing: Easing.linear 
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View style={styles.carouselContainer}>
      <View style={styles.carouselTrack}>
        <Animated.View style={[styles.carouselContent, animatedStyle]}>
          {/* Render universities twice for seamless loop */}
          {[...universities, ...universities].map((university, index) => (
            <View key={`${university.name}-${index}`} style={styles.universityIcon}>
              <View style={[styles.universityCircle, { backgroundColor: university.color }]}>
                <Text style={styles.universityText}>{university.name}</Text>
              </View>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
};

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

  const handleChooseCampus = () => {
    router.push('/(onboarding)/university-selection');
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
        colors={['#6B46C1', '#8B5CF6', '#EC4899', '#F97316']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.backgroundGradient}
      />

      <View style={styles.content}>
        {/* Logo Section */}
        <Animated.View style={[styles.logoSection, animatedLogoStyle]}>
          <HustlLogo />
        </Animated.View>

        {/* Welcome Text */}
        <Animated.View style={[styles.welcomeSection, animatedTitleStyle]}>
          <Text style={styles.welcomeTitle}>Welcome to Hustl!</Text>
          <Text style={styles.welcomeTagline}>
            Your campus. Your network. Your hustle.
          </Text>
          <Text style={styles.welcomeDescription}>
            Select your university to get started with campus tasks, food pickups, and more.
          </Text>
        </Animated.View>

        {/* University Carousel */}
        <Animated.View style={[styles.universitySection, animatedContentStyle]}>
          <UniversityCarousel />
        </Animated.View>

        {/* Bottom Action Section */}
        <Animated.View style={[styles.bottomSection, animatedButtonStyle]}>
          <TouchableOpacity 
            style={styles.primaryButtonContainer}
            onPress={handleChooseCampus}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#F97316', '#3B82F6']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.primaryButton}
            >
              <MapPin size={20} color={Colors.white} strokeWidth={2} />
              <Text style={styles.primaryButtonText}>Choose Your Campus</Text>
              <ChevronRight size={20} color={Colors.white} strokeWidth={2.5} />
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
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHalo: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoWrapper: {
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  welcomeSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
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
  universitySection: {
    alignItems: 'center',
    paddingBottom: 60,
  },
  carouselContainer: {
    height: 80,
    overflow: 'hidden',
    width: width,
  },
  carouselTrack: {
    width: width,
    height: 80,
    overflow: 'hidden',
  },
  carouselContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 80,
  },
  universityIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
  },
  universityCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  universityText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 24,
  },
  primaryButtonContainer: {
    shadowColor: '#F97316',
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
    minHeight: 64,
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