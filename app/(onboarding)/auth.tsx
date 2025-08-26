import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, Zap, Star, Shield } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withRepeat,
  withSequence,
  interpolate,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';

const { width, height } = Dimensions.get('window');

// Animated Background Component
const AnimatedBackground = () => {
  const float1 = useSharedValue(0);
  const float2 = useSharedValue(0);
  const float3 = useSharedValue(0);

  React.useEffect(() => {
    float1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 8000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    float2.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 12000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    float3.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 15000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 15000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => {
    const translateY = interpolate(float1.value, [0, 1], [0, -30]);
    const opacity = interpolate(float1.value, [0, 0.5, 1], [0.1, 0.2, 0.1]);
    return { transform: [{ translateY }], opacity };
  });

  const animatedStyle2 = useAnimatedStyle(() => {
    const translateY = interpolate(float2.value, [0, 1], [0, 40]);
    const opacity = interpolate(float2.value, [0, 0.5, 1], [0.08, 0.15, 0.08]);
    return { transform: [{ translateY }], opacity };
  });

  const animatedStyle3 = useAnimatedStyle(() => {
    const translateY = interpolate(float3.value, [0, 1], [0, -20]);
    const opacity = interpolate(float3.value, [0, 0.5, 1], [0.12, 0.25, 0.12]);
    return { transform: [{ translateY }], opacity };
  });

  return (
    <View style={styles.backgroundContainer}>
      <Animated.View style={[styles.floatingElement1, animatedStyle1]} />
      <Animated.View style={[styles.floatingElement2, animatedStyle2]} />
      <Animated.View style={[styles.floatingElement3, animatedStyle3]} />
    </View>
  );
};

// Enhanced Hero Section
const HeroSection = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  const fadeIn = useSharedValue(0);
  const slideUp = useSharedValue(30);
  const iconRotate = useSharedValue(0);
  const glowPulse = useSharedValue(0);

  React.useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 800 });
    slideUp.value = withSpring(0, { damping: 15, stiffness: 300 });
    
    iconRotate.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );

    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ translateY: slideUp.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotate.value}deg` }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(glowPulse.value, [0, 1], [0.15, 0.35]);
    return { shadowOpacity };
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleGetStarted = () => {
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
    <Animated.View style={[styles.heroSection, animatedStyle]}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.92)']}
        style={styles.heroGradient}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroLeft}>
            <Text style={styles.greeting}>
              {getGreeting()}{user ? `, ${user.displayName.split(' ')[0]}` : ''}
            </Text>
            <Text style={styles.heroTitle}>
              Ready to{'\n'}
              <Text style={styles.heroTitleAccent}>Hustl</Text> today?
            </Text>
            <Text style={styles.heroSubtitle}>
              Connect with fellow students for quick tasks and campus services
            </Text>
            
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={handleGetStarted}
              activeOpacity={0.9}
            >
              <Animated.View style={[styles.ctaContainer, animatedGlowStyle]}>
                <LinearGradient
                  colors={['#0047FF', '#0021A5']}
                  style={styles.ctaGradient}
                >
                  <Zap size={20} color={Colors.white} strokeWidth={2.5} fill={Colors.white} />
                  <Text style={styles.ctaText}>Start Hustling</Text>
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          </View>
          
          <Animated.View style={[styles.heroIcon, animatedIconStyle]}>
            <View style={styles.heroIconContainer}>
              <LinearGradient
                colors={['#FA4616', '#FF6B35']}
                style={styles.heroIconGradient}
              >
                <Zap size={32} color={Colors.white} strokeWidth={2.5} fill={Colors.white} />
              </LinearGradient>
            </View>
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// Enhanced Category Card
const CategoryCard = ({ 
  category, 
  index, 
  onSelectTask,
  isSelecting 
}: { 
  category: any; 
  index: number; 
  onSelectTask: () => void;
  isSelecting: boolean;
}) => {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const haloOpacity = useSharedValue(0);
  const borderPulse = useSharedValue(0);
  const iconFloat = useSharedValue(0);

  React.useEffect(() => {
    const delay = 200 + index * 80;
    
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 15, stiffness: 300 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 15, stiffness: 300 }));
    
    // Halo effect for popular/trending
    if (category.popular || category.trending) {
      haloOpacity.value = withDelay(
        delay + 400,
        withRepeat(
          withSequence(
            withTiming(0.4, { duration: 2000 }),
            withTiming(0.2, { duration: 2000 })
          ),
          -1,
          true
        )
      );
    }

    // Border pulse animation
    borderPulse.value = withDelay(
      delay + 600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3000 }),
          withTiming(0, { duration: 3000 })
        ),
        -1,
        true
      )
    );

    // Icon floating animation
    iconFloat.value = withDelay(
      delay + 800,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2500 }),
          withTiming(0, { duration: 2500 })
        ),
        -1,
        true
      )
    );
  }, [index, category.popular, category.trending]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const animatedHaloStyle = useAnimatedStyle(() => ({
    shadowOpacity: haloOpacity.value,
  }));

  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderOpacity = interpolate(borderPulse.value, [0, 1], [0.2, 0.6]);
    return {
      borderColor: `${category.color}${Math.floor(borderOpacity * 255).toString(16).padStart(2, '0')}`,
    };
  });

  const animatedIconStyle = useAnimatedStyle(() => {
    const translateY = interpolate(iconFloat.value, [0, 1], [0, -3]);
    return { transform: [{ translateY }] };
  });

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    onSelectTask();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.95} style={styles.categoryCardContainer}>
      <Animated.View style={[styles.categoryCard, animatedStyle]}>
        {/* Halo Effect */}
        {(category.popular || category.trending) && (
          <Animated.View style={[
            styles.haloEffect,
            { backgroundColor: category.color },
            animatedHaloStyle
          ]} />
        )}

        {/* Animated Border */}
        <Animated.View style={[styles.animatedBorder, animatedBorderStyle]} />

        {/* Badge */}
        {category.popular && (
          <View style={styles.popularBadge}>
            <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.badgeGradient}>
              <Star size={10} color={Colors.white} strokeWidth={2} fill={Colors.white} />
              <Text style={styles.badgeText}>Popular</Text>
            </LinearGradient>
          </View>
        )}

        {category.trending && (
          <View style={styles.trendingBadge}>
            <LinearGradient colors={['#FF6B35', '#FF4500']} style={styles.badgeGradient}>
              <Zap size={10} color={Colors.white} strokeWidth={2} fill={Colors.white} />
              <Text style={styles.badgeText}>Hot</Text>
            </LinearGradient>
          </View>
        )}

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: category.image }} style={styles.categoryImage} />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
            style={styles.imageOverlay}
          />
          
          {/* Floating Icon */}
          <Animated.View style={[styles.floatingIcon, animatedIconStyle]}>
            <LinearGradient colors={[category.color, category.color + 'CC']} style={styles.iconGradient}>
              <category.icon size={20} color={Colors.white} strokeWidth={2.5} />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.categoryTitle} numberOfLines={1}>{category.title}</Text>
          <Text style={styles.categorySubtitle} numberOfLines={1}>{category.subtitle}</Text>
          
          <TouchableOpacity
            style={[styles.selectButton, isSelecting && styles.selectButtonDisabled]}
            onPress={onSelectTask}
            disabled={isSelecting}
          >
            {isSelecting ? (
              <View style={styles.loadingState}>
                <Text style={styles.loadingText}>...</Text>
              </View>
            ) : (
              <LinearGradient colors={['#0047FF', '#0021A5']} style={styles.selectGradient}>
                <Text style={styles.selectText}>Select</Text>
                <Zap size={12} color={Colors.white} strokeWidth={2} />
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, signup, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Animation values
  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(30);
  const iconRotate = useSharedValue(0);
  const glowPulse = useSharedValue(0);

  React.useEffect(() => {
    // Logo entrance animation
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    
    // Form entrance animation
    formOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    formTranslateY.value = withDelay(400, withSpring(0, { damping: 15 }));

    // Icon rotation
    iconRotate.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );

    // Glow pulse
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const animatedFormStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotate.value}deg` }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(glowPulse.value, [0, 1], [0.2, 0.4]);
    return { shadowOpacity };
  });

  const handleAuth = async () => {
    setError('');

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

    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
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

      router.replace('/(tabs)/home');
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const toggleAuthMode = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    setIsLogin(!isLogin);
    setError('');
  };

  const handleBack = () => {
    router.back();
  };

  const isFormValid = email.trim() && password.trim() && (isLogin || displayName.trim());

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AnimatedBackground />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={Colors.semantic.bodyText} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo Section */}
        <Animated.View style={[styles.logoSection, animatedLogoStyle]}>
          <Animated.View style={[styles.logoContainer, animatedGlowStyle]}>
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../src/assets/images/image.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Animated.View style={[styles.logoIconOverlay, animatedIconStyle]}>
                <Zap size={24} color={Colors.white} strokeWidth={2} fill={Colors.white} />
              </Animated.View>
            </View>
          </Animated.View>
          
          <Text style={styles.brandTitle}>
            {isLogin ? 'Welcome Back to' : 'Join'} <Text style={styles.brandAccent}>Hustl</Text>
          </Text>
          <Text style={styles.brandSubtitle}>
            {isLogin ? 'Sign in to continue hustling' : 'Start your campus hustle journey'}
          </Text>
        </Animated.View>

        {/* Form Section */}
        <Animated.View style={[styles.formSection, animatedFormStyle]}>
          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Shield size={16} color={Colors.semantic.errorAlert} strokeWidth={2} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Display Name</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <User size={18} color={Colors.primary} strokeWidth={2} />
                  </View>
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Mail size={18} color={Colors.primary} strokeWidth={2} />
                </View>
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Lock size={18} color={Colors.primary} strokeWidth={2} />
                </View>
                <TextInput
                  style={styles.passwordInput}
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
                    <EyeOff size={18} color={Colors.semantic.tabInactive} strokeWidth={2} />
                  ) : (
                    <Eye size={18} color={Colors.semantic.tabInactive} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, (!isFormValid || isLoading) && styles.disabledButton]}
              onPress={handleAuth}
              disabled={!isFormValid || isLoading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={isFormValid && !isLoading ? ['#0047FF', '#0021A5'] : ['#E5E7EB', '#D1D5DB']}
                style={styles.primaryButtonGradient}
              >
                <Zap size={18} color={Colors.white} strokeWidth={2} fill={Colors.white} />
                <Text style={[styles.primaryButtonText, (!isFormValid || isLoading) && styles.disabledButtonText]}>
                  {isLoading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={toggleAuthMode}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <View style={styles.secondaryButtonContent}>
                <User size={16} color={Colors.primary} strokeWidth={2} />
                <Text style={styles.secondaryButtonText}>
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingElement1: {
    position: 'absolute',
    top: '15%',
    right: '10%',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 33, 165, 0.08)',
  },
  floatingElement2: {
    position: 'absolute',
    top: '60%',
    left: '5%',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(250, 70, 22, 0.06)',
  },
  floatingElement3: {
    position: 'absolute',
    top: '35%',
    left: '75%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 20,
  },
  logoContainer: {
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 12,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 3,
    borderColor: 'rgba(0, 33, 165, 0.1)',
  },
  logo: {
    width: 60,
    height: 60,
  },
  logoIconOverlay: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: '#FA4616',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: Colors.primary,
  },
  brandSubtitle: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    lineHeight: 22,
  },
  formSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 32,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: Colors.semantic.errorAlert,
    fontWeight: '500',
  },
  form: {
    gap: 24,
    marginBottom: 32,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.6)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 33, 165, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.inputText,
    fontWeight: '500',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.inputText,
    fontWeight: '500',
  },
  eyeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    gap: 16,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
    minHeight: 56,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },
  disabledButton: {
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledButtonText: {
    color: Colors.semantic.tabInactive,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0, 33, 165, 0.2)',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  secondaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Hero Section (reused from home)
  heroSection: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  heroGradient: {
    borderRadius: 24,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 32,
    gap: 24,
  },
  heroLeft: {
    flex: 1,
    gap: 16,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0021A5',
    opacity: 0.8,
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  heroTitleAccent: {
    color: '#FA4616',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    opacity: 0.9,
  },
  ctaButton: {
    alignSelf: 'flex-start',
  },
  ctaContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 12,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },
  heroIcon: {
    width: 80,
    height: 80,
  },
  heroIconContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#FA4616',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Category Cards (responsive grid)
  categoriesSection: {
    marginHorizontal: 20,
    marginBottom: 40,
  },
  categoriesHeader: {
    marginBottom: 24,
    gap: 8,
  },
  categoriesTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  categoriesSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  categoryCardContainer: {
    width: (width - 56) / 2, // 2 columns with proper spacing
  },
  categoryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    position: 'relative',
  },
  haloEffect: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 28,
    zIndex: -1,
  },
  animatedBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 2,
    zIndex: 1,
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  trendingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  imageContainer: {
    height: 100,
    position: 'relative',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 16,
    gap: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  categorySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  selectButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingState: {
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#9CA3AF',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  selectGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  selectText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },
});