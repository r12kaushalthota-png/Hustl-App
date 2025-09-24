import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Dimensions, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, User, Mail, Lock } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withSequence,
  withDelay,
  interpolate,
  withRepeat,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import HustlLogo from '@/components/HustlLogo';

// Exact brand colors from the logo
const BrandColors = {
  primary: '#0D2DEB', // Hustl Blue
  purple: '#6B2BBF', // Hustl Purple
  red: '#E53935', // Hustl Red
  orange: '#FF5A1F', // Hustl Orange
  accentYellow: '#FFC400', // Badge yellow
  surface: '#FFFFFF',
  title: '#0A0F1F',
  subtitle: '#5B6475',
  divider: '#E9EDF5',
};

// Brand gradients
const BrandGradients = {
  primary: [BrandColors.primary, BrandColors.purple, BrandColors.red, BrandColors.orange],
  button: [BrandColors.primary, '#3D6BFF'],
};

const { width, height } = Dimensions.get('window');

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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Gradient background */}
      <LinearGradient
        colors={BrandGradients.primary}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.4, 0.7, 1]}
        style={styles.backgroundGradient}
      />

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={BrandColors.surface} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isLogin ? 'Welcome Back' : 'Join Hustl'}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Logo and Title */}
        <Animated.View style={[styles.authHeader, animatedHeaderStyle]}>
          <HustlLogo 
            size="large" 
            animated={true} 
            showGlow={true}
          />
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Continue to your campus network' : 'Join your campus community'}
            </Text>
          </View>
        </Animated.View>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form */}
        <Animated.View style={[styles.form, animatedFormStyle]}>
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Display Name</Text>
              <View style={styles.inputWithIcon}>
                <User size={20} color={BrandColors.subtitle} strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter your display name"
                  placeholderTextColor={BrandColors.subtitle}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWithIcon}>
              <Mail size={20} color={BrandColors.subtitle} strokeWidth={2} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={BrandColors.subtitle}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWithIcon}>
              <Lock size={20} color={BrandColors.subtitle} strokeWidth={2} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={BrandColors.subtitle}
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
                  <EyeOff size={20} color={BrandColors.subtitle} strokeWidth={2} />
                ) : (
                  <Eye size={20} color={BrandColors.subtitle} strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Buttons */}
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
                {isLoading && <ActivityIndicator size="small" color={BrandColors.surface} />}
                <Text style={styles.disabledButtonText}>
                  {isLoading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                </Text>
              </View>
            ) : (
              <LinearGradient
                colors={BrandGradients.button}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.primaryButtonGradient}
              >
                <HustlLogo size="small" />
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
            <Text style={styles.secondaryButtonText}>
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.surface,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerPlaceholder: {
    width: 40,
  },
  authHeader: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 32,
  },
  titleContainer: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: BrandColors.surface,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: BrandColors.surface,
    textAlign: 'center',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 107, 0.5)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 16,
    color: BrandColors.surface,
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: BrandColors.surface,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    minHeight: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: BrandColors.title,
  },
  eyeButton: {
    padding: 4,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    minHeight: 56,
    marginTop: 32,
    marginBottom: 16,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
    minHeight: 56,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.surface,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
    minHeight: 56,
  },
  disabledButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: BrandColors.surface,
    opacity: 0.7,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.surface,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});