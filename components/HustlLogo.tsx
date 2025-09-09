import React from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  interpolate,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

// Exact brand colors from the logo
const BrandColors = {
  primary: '#0D2DEB', // Hustl Blue
  purple: '#6B2BBF', // Hustl Purple
  red: '#E53935', // Hustl Red
  orange: '#FF5A1F', // Hustl Orange
  surface: '#FFFFFF',
};

// Brand gradients
const BrandGradients = {
  primary: [BrandColors.primary, BrandColors.purple, BrandColors.red, BrandColors.orange],
};

// Logo sizes
const LogoSizes = {
  small: 24,
  medium: 32,
  large: 48,
  xlarge: 64,
};

interface HustlLogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  variant?: 'icon' | 'wordmark' | 'full';
  animated?: boolean;
  showGlow?: boolean;
  style?: any;
}

export default function HustlLogo({ 
  size = 'medium',
  variant = 'icon',
  animated = false,
  showGlow = false,
  style 
}: HustlLogoProps) {
  const glowOpacity = useSharedValue(0.3);
  const pulseScale = useSharedValue(1);
  const rotateAnimation = useSharedValue(0);

  React.useEffect(() => {
    if (animated) {
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

      // Slow rotation for halo
      rotateAnimation.value = withRepeat(
        withTiming(360, { duration: 20000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [animated]);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: showGlow ? glowOpacity.value : 0,
    transform: [{ scale: animated ? pulseScale.value : 1 }],
  }));

  const animatedHaloStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateAnimation.value}deg` }],
    opacity: animated ? 0.3 : 0,
  }));

  const getSizeValue = () => {
    switch (size) {
      case 'small': return LogoSizes.small;
      case 'medium': return LogoSizes.medium;
      case 'large': return LogoSizes.large;
      case 'xlarge': return LogoSizes.xlarge;
      default: return LogoSizes.medium;
    }
  };

  const logoSize = getSizeValue();
  const containerSize = logoSize + (showGlow ? 40 : 0);

  if (variant === 'icon') {
    return (
      <View style={[styles.container, { width: containerSize, height: containerSize }, style]}>
        {/* Use the actual logo image */}
        <Animated.View style={[
          styles.logoWrapper,
          {
            width: logoSize,
            height: logoSize,
            borderRadius: logoSize / 2,
            shadowColor: BrandColors.red
          },
          animatedGlowStyle
        ]}>
          <Image
            source={require('@/src/assets/images/image copy copy.png')}
            style={[styles.logoImage, { 
              width: logoSize, 
              height: logoSize, 
              borderRadius: logoSize / 2 
            }]}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    );
  }

  // For other variants, use gradient circle with H
  return (
    <View style={[styles.container, { width: containerSize, height: containerSize }, style]}>
        {/* Rotating halo for animated version */}
        {animated && (
          <Animated.View style={[
            styles.halo, 
            { 
              width: logoSize + 40, 
              height: logoSize + 40,
              borderRadius: (logoSize + 40) / 2 
            },
            animatedHaloStyle
          ]} />
        )}
        
        {/* Main logo with glow */}
        <Animated.View style={[
          styles.logoWrapper,
          {
            width: logoSize,
            height: logoSize,
            borderRadius: logoSize / 2,
            shadowColor: BrandColors.red
          },
          animatedGlowStyle
        ]}>
          <LinearGradient
            colors={BrandGradients.primary}
            style={[styles.logoCircle, { 
              width: logoSize, 
              height: logoSize, 
              borderRadius: logoSize / 2 
            }]}
          >
            <Text style={[styles.logoText, { fontSize: logoSize * 0.35 }]}>H</Text>
          </LinearGradient>
        </Animated.View>
      </View>
    );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoWrapper: {
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 16,
  },
  logoCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoImage: {
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoText: {
    fontWeight: '700',
    color: BrandColors.surface,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});