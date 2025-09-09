import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import HustlLogo from '@/components/HustlLogo';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  useEffect(() => {
    // Logo animation
    opacity.value = withSpring(1, { damping: 15 });
    scale.value = withSpring(1, { damping: 15 });

    // Text animation with delay
    textOpacity.value = withDelay(500, withTiming(1, { duration: 800 }));
    textTranslateY.value = withDelay(500, withSpring(0, { damping: 15 }));

    // Auto-advance to university selection
    const timer = setTimeout(() => {
      // Fade out animations before navigation
      opacity.value = withTiming(0, { duration: 300 });
      scale.value = withTiming(0.9, { duration: 300 });
      textOpacity.value = withTiming(0, { duration: 300 });
      textTranslateY.value = withTiming(-10, { duration: 300 });
      
      // Navigate after fade out
      setTimeout(() => {
       router.replace('/(onboarding)/welcome');
      }, 300);
    }, 2200);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.logoContainer, animatedStyle]}>
        <HustlLogo 
          size="xlarge" 
          animated={true} 
          showGlow={true}
        />
      </Animated.View>
      
      <Animated.View style={[styles.textContainer, animatedTextStyle]}>
        <Text style={styles.brandText}>
          Sit tight. We're Hustling some info…
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: width * 0.6,
    height: width * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  textContainer: {
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6', // Lighter UF blue
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.5,
  },
});