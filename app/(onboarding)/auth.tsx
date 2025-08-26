import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, Zap, Shield, Star } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withSequence,
  withDelay,
  interpolate,
  withRepeat
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useAuth } from '@contexts/AuthContext';

const { width, height } = Dimensions.get('window');

// Animated Background Component
const AnimatedBackground = () => {
  const floatingAnimation1 = useSharedValue(0);
  const floatingAnimation2 = useSharedValue(0);
  const shimmerAnimation = useSharedValue(-1);

  React.useEffect(() => {
    floatingAnimation1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 8000 }),
        withTiming(0, { duration: 8000 })
      ),
      -1,
      true
    );

    floatingAnimation2.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 12000 }),
        withTiming(0, { duration: 12000 })
      ),
      -1,
      true
    );

    shimmerAnimation.value = withRepeat(
      withTiming(1, { duration: 6000 }),
      -1,
      false
    );
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => {
    const translateY = interpolate(floatingAnimation1.value, [0, 1], [0, -30]);
    const opacity = interpolate(floatingAnimation1.value, [0, 0.5, 1], [0.1, 0.2, 0.1]);
    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const animatedStyle2 = useAnimatedStyle(() => {
    const translateY = interpolate(floatingAnimation2.value, [0, 1], [0, 40]);
    const opacity = interpolate(floatingAnimation2.value, [0, 0.5, 1], [0.08, 0.15, 0.08]);
    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerAnimation.value, [0, 1], [-width, width * 2]);
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View style={styles.backgroundContainer}>
      <Animated.View style={[styles.floatingElement1, animatedStyle1]} />
      <Animated.View style={[styles.floatingElement2, animatedStyle2]} />
      <Animated.View style={[styles.shimmerElement, shimmerStyle]} />
    </View>
  );
};

// Enhanced Logo Component
const BrandLogo = () => {
  const glowAnimation = useSharedValue(0);
  const rotateAnimation = useSharedValue(0);

  React.useEffect(() => {
    glowAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000 }),
        withTiming(0, { duration: 3000 })
      ),
      -1,
      true
    );

    rotateAnimation.value = withRepeat(
      withTiming(360, { duration: 20000 }),
      -1,
      false
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(glowAnimation.value, [0, 1], [0.2, 0.6]);
    return { shadowOpacity };
  });

  const animatedRotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateAnimation.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.logoContainer, animatedGlowStyle]}>
      <Animated.View style={[styles.logoHalo, animatedRotateStyle]} />
      <View style={styles.logoWrapper}>
        <Image
          source={require('../../src/assets/images/image.png')}
          style={styles.authLogo}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
};

// Premium Feature Highlights
const FeatureHighlights = () => {
  const features = [
    { icon: Zap, text: 'Instant Task Matching', color: '#0021A5' },
    { icon: Shield, text: 'Verified Students Only', color: '#FA4616' },
    { icon: Star, text: 'Premium Experience', color: '#FFD700' },
  ];

  return (
    <View style={styles.featuresContainer}>
      {features.map((feature, index) => {
        const fadeIn = useSharedValue(0);
        const slideUp = useSharedValue(20);

        React.useEffect(() => {
          fadeIn.value = withDelay(
            1000 + index * 200,
            withTiming(1, { duration: 600 })
          );
          slideUp.value = withDelay(
            1000 + index * 200,
            withSpring(0, { damping: 15 })
          );
        }, []);

        const animatedStyle = useAnimatedStyle(() => ({
          opacity: fadeIn.value,
          transform: [{ translateY: slideUp.value }],
        }));

        return (
          <Animated.View key={index} style={[styles.featureItem, animatedStyle]}>
            <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
              <feature.icon size={16} color={feature.color} strokeWidth={2} />
            </View>
            <Text style={styles.featureText}>{feature.text}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
};

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, signup, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Animation values
  const fadeIn = useSharedValue(0);
  const slideUp = useSharedValue(30);
  const formOpacity = useSharedValue(0);

  React.useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 800 });
    slideUp.value = withSpring(0, { damping: 15 });
    formOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
  }, []);

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ translateY: slideUp.value }],
  }));

  const animatedFormStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  const handleAuth = async () => {
    // Clear previous errors
    setError('');

    // Basic validation
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    if (!isLogin && !displayName.trim()) {
      setError('Please enter your display name.');
      return;
    }

    try {
      let result;
      if (isLogin) {
        result = await login(email, password);
      } else {
        result = await signup(email, password, displayName);
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      // Success - navigate to home
      router.replace('/(tabs)/home');
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError(''); // Clear errors when switching modes
  };

  const handleBack = () => {
    router.back();
  };

  const isFormValid = email.trim() && password.trim() && (isLogin || displayName.trim());

  return (
    <View style={styles.container}>
      <AnimatedBackground />
      
      {/* Premium Header */}
      <LinearGradient
        colors={['rgba(0, 33, 165, 0.95)', 'rgba(250, 70, 22, 0.85)']}
        style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerBrand}>Hustl</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Premium Auth Header */}
        <Animated.View style={[styles.authHeader, animatedHeaderStyle]}>
          <BrandLogo />
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {isLogin ? 'Welcome Back' : 'Join the Hustl'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Continue your campus journey' : 'Start your premium campus experience'}
            </Text>
          </View>
          
          <FeatureHighlights />
        </Animated.View>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Animated.View style={[styles.form, animatedFormStyle]}>
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Display Name</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter your display name"
                  placeholderTextColor={Colors.semantic.tabInactive}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={Colors.semantic.tabInactive}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.passwordInputField}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={Colors.semantic.tabInactive}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                ) : (
                  <Eye size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.buttonContainer, animatedFormStyle]}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!isFormValid || isLoading) && styles.disabledButton
            ]}
            onPress={handleAuth}
            disabled={!isFormValid || isLoading}
            activeOpacity={0.9}
          >
            {(!isFormValid || isLoading) ? (
              <View style={styles.disabledButtonContent}>
                <Text style={styles.disabledButtonText}>
                  {isLoading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                </Text>
              </View>
            ) : (
              <LinearGradient
                colors={['#0047FF', '#0021A5', '#FA4616']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                locations={[0, 0.7, 1]}
                style={styles.primaryButtonGradient}
              >
                <Zap size={18} color={Colors.white} strokeWidth={2.5} fill={Colors.white} />
                <Text style={styles.primaryButtonText}>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={toggleAuthMode}
            disabled={isLoading}
            activeOpacity={0.9}
          >
            <View style={styles.secondaryButtonContent}>
              <Text style={styles.secondaryButtonText}>
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  floatingElement1: {
    position: 'absolute',
    top: '15%',
    right: '10%',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#0021A5',
  },
  floatingElement2: {
    position: 'absolute',
    top: '60%',
    left: '5%',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FA4616',
  },
  shimmerElement: {
    position: 'absolute',
    top: 0,
    width: 200,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ skewX: '-20deg' }],
  },
  headerGradient: {
    paddingBottom: 24,
    zIndex: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  headerBrand: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  authHeader: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 32,
  },
  logoContainer: {
    position: 'relative',
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 12,
  },
  logoHalo: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(0, 33, 165, 0.3)',
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  authLogo: {
    width: 80,
    height: 80,
  },
  titleContainer: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    gap: 16,
    alignItems: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  errorContainer: {
    backgroundColor: 'rgba(254, 242, 242, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(254, 202, 202, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  errorText: {
    fontSize: 16,
    color: Colors.semantic.errorAlert,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  form: {
    gap: 24,
    marginBottom: 40,
  },
  inputContainer: {
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 4,
  },
  inputWrapper: {
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    backdropFilter: 'blur(20px)',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontSize: 17,
    color: '#111827',
    backgroundColor: 'transparent',
    minHeight: 56,
  },
  passwordInputField: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontSize: 17,
    color: '#111827',
    backgroundColor: 'transparent',
    minHeight: 56,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  buttonContainer: {
    gap: 20,
    paddingTop: 20,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    minHeight: 56,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
    minHeight: 56,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledButtonContent: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  disabledButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0, 33, 165, 0.3)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    minHeight: 56,
    backdropFilter: 'blur(20px)',
  },
  secondaryButtonContent: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0021A5',
    letterSpacing: 0.3,
  },
});