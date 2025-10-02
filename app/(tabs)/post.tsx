import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ArrowLeft, MapPin, Store, Clock, DollarSign, Zap, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { Tokens } from '@/constants/Tokens';
import { TaskRepo } from '@/lib/taskRepo';
import { ModerationService } from '@/lib/moderation';
import SearchBoxApple from '@/components/SearchBoxApple';
import Toast from '@/components/Toast';
import CheckoutForm from '@/components/CheckoutForm';

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
  primary: [
    BrandColors.primary,
    BrandColors.purple,
    BrandColors.red,
    BrandColors.orange,
  ],
  button: [BrandColors.primary, '#3D6BFF'],
};

// Task categories with their details
const TASK_CATEGORIES = {
  food: {
    title: 'Food Delivery',
    description: 'Get food delivered from campus restaurants',
    icon: '🍔',
    defaultStore: 'Chipotle',
    estimatedMinutes: 30,
    rewardCents: 500,
  },
  coffee: {
    title: 'Coffee Run',
    description: 'Fresh coffee from campus cafés',
    icon: '☕',
    defaultStore: 'Starbucks',
    estimatedMinutes: 15,
    rewardCents: 300,
  },
  grocery: {
    title: 'Grocery Shopping',
    description: 'Essentials from nearby stores',
    icon: '🛒',
    defaultStore: 'Target',
    estimatedMinutes: 45,
    rewardCents: 800,
  },
};

// Urgency levels
const URGENCY_LEVELS = [
  { value: 'low', label: 'Low', color: '#10B981', description: 'No rush' },
  {
    value: 'medium',
    label: 'Medium',
    color: '#F59E0B',
    description: 'Within an hour',
  },
  {
    value: 'high',
    label: 'High',
    color: '#EF4444',
    description: 'ASAP',
  },
];

export default function PostTaskScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, isGuest } = useAuth();

  // Get category from params or default to food
  const initialCategory = (params.category as string) || 'food';
  const categoryData = TASK_CATEGORIES[initialCategory as keyof typeof TASK_CATEGORIES] || TASK_CATEGORIES.food;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [store, setStore] = useState(categoryData.defaultStore);
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffInstructions, setDropoffInstructions] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [rewardCents, setRewardCents] = useState(categoryData.rewardCents);
  const [estimatedMinutes, setEstimatedMinutes] = useState(categoryData.estimatedMinutes);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Set initial title based on category
  useEffect(() => {
    if (!title) {
      setTitle(categoryData.title);
    }
  }, [categoryData]);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleBack = () => {
    router.back();
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Title validation
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (title.trim().length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    // Store validation
    if (!store.trim()) {
      newErrors.store = 'Store/restaurant is required';
    }

    // Dropoff address validation
    if (!dropoffAddress.trim()) {
      newErrors.dropoffAddress = 'Dropoff address is required';
    }

    // Reward validation
    if (rewardCents < 100) {
      newErrors.reward = 'Reward must be at least $1.00';
    } else if (rewardCents > 10000) {
      newErrors.reward = 'Reward must be less than $100.00';
    }

    // Estimated time validation
    if (estimatedMinutes < 5) {
      newErrors.estimatedMinutes = 'Estimated time must be at least 5 minutes';
    } else if (estimatedMinutes > 480) {
      newErrors.estimatedMinutes = 'Estimated time must be less than 8 hours';
    }

    // Content moderation
    const moderationResult = ModerationService.moderateTask(title, description);
    if (!moderationResult.isAllowed) {
      newErrors.moderation = moderationResult.message || 'Content not allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = (): boolean => {
    return (
      title.trim().length >= 3 &&
      store.trim().length > 0 &&
      dropoffAddress.trim().length > 0 &&
      rewardCents >= 100 &&
      rewardCents <= 10000 &&
      estimatedMinutes >= 5 &&
      estimatedMinutes <= 480 &&
      Object.keys(errors).length === 0
    );
  };

  const submitTask = async () => {
    if (!user || isGuest) {
      setToast({
        visible: true,
        message: 'Please sign in to post tasks',
        type: 'error',
      });
      return;
    }

    if (!validateForm()) {
      setToast({
        visible: true,
        message: 'Please fix the errors above',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        category: initialCategory as 'food' | 'coffee' | 'grocery',
        store: store.trim(),
        dropoff_address: dropoffAddress.trim(),
        dropoff_instructions: dropoffInstructions.trim(),
        urgency,
        reward_cents: rewardCents,
        estimated_minutes: estimatedMinutes,
      };

      const { data, error } = await TaskRepo.createTask(taskData, user.id);

      if (error) {
        setToast({
          visible: true,
          message: error,
          type: 'error',
        });
        return;
      }

      if (data) {
        setToast({
          visible: true,
          message: 'Task posted successfully!',
          type: 'success',
        });

        // Navigate to task detail after short delay
        setTimeout(() => {
          router.replace(`/task/${data.id}`);
        }, 1500);
      }
    } catch (error) {
      setToast({
        visible: true,
        message: 'Failed to post task. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRewardChange = (text: string) => {
    const numericValue = text.replace(/[^0-9.]/g, '');
    const dollars = parseFloat(numericValue) || 0;
    const cents = Math.round(dollars * 100);
    setRewardCents(Math.min(10000, Math.max(0, cents)));
  };

  const handleEstimatedTimeChange = (text: string) => {
    const minutes = parseInt(text) || 0;
    setEstimatedMinutes(Math.min(480, Math.max(0, minutes)));
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  const formatReward = (cents: number): string => {
    return (cents / 100).toFixed(2);
  };

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" />
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={Tokens.hitSlop.medium}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ArrowLeft size={24} color={BrandColors.surface} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} allowFontScaling={false}>Post Task</Text>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={true}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, Tokens.spacing.sm) + tabBarHeight + Tokens.spacing.jumbo,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
          {/* Category Header */}
          <View style={styles.categoryHeader}>
            <LinearGradient
              colors={BrandGradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              locations={[0, 0.4, 0.7, 1]}
              style={styles.categoryGradient}
            >
              <View style={styles.categoryContent}>
                <Text style={styles.categoryIcon}>{categoryData.icon}</Text>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryTitle}>{categoryData.title}</Text>
                  <Text style={styles.categoryDescription}>
                    {categoryData.description}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                What do you need? <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Chipotle bowl with extra guac"
                placeholderTextColor={BrandColors.subtitle}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                editable={!isSubmitting}
              />
              {errors.title && (
                <Text style={styles.errorText}>{errors.title}</Text>
              )}
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Additional Details</Text>
              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="Any specific preferences, dietary restrictions, or special requests..."
                placeholderTextColor={BrandColors.subtitle}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!isSubmitting}
              />
            </View>

            {/* Store */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Store/Restaurant <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWithIcon}>
                <Store
                  size={20}
                  color={BrandColors.subtitle}
                  strokeWidth={2}
                />
                <TextInput
                  style={[
                    styles.inputText,
                    errors.store && styles.inputTextError,
                  ]}
                  value={store}
                  onChangeText={setStore}
                  placeholder="e.g., Chipotle, Starbucks, Target"
                  placeholderTextColor={BrandColors.subtitle}
                  editable={!isSubmitting}
                />
              </View>
              {errors.store && (
                <Text style={styles.errorText}>{errors.store}</Text>
              )}
            </View>

            {/* Dropoff Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Dropoff Address <Text style={styles.required}>*</Text>
              </Text>
              <SearchBoxApple
                placeholder="Enter your dorm, building, or address"
                onSelect={(location) => {
                  setDropoffAddress(location.label);
                }}
                biasRegion={{ lat: 29.6436, lon: -82.3549, span: 0.05 }}
                initialText={dropoffAddress}
                setTextInput={setDropoffAddress}
                onBlurInput={() => {}}
                error={!!errors.dropoffAddress}
                icon={
                  <MapPin
                    size={20}
                    color={BrandColors.subtitle}
                    strokeWidth={2}
                  />
                }
              />
              {errors.dropoffAddress && (
                <Text style={styles.errorText}>{errors.dropoffAddress}</Text>
              )}
            </View>

            {/* Dropoff Instructions */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dropoff Instructions</Text>
              <TextInput
                style={styles.input}
                value={dropoffInstructions}
                onChangeText={setDropoffInstructions}
                placeholder="e.g., Leave at front desk, Room 302, etc."
                placeholderTextColor={BrandColors.subtitle}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                editable={!isSubmitting}
              />
            </View>

            {/* Urgency */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Urgency</Text>
              <View style={styles.urgencyContainer}>
                {URGENCY_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level.value}
                    style={[
                      styles.urgencyOption,
                      urgency === level.value && styles.activeUrgencyOption,
                      { borderColor: level.color + '40' },
                      urgency === level.value && {
                        backgroundColor: level.color + '20',
                      },
                    ]}
                    onPress={() => setUrgency(level.value as any)}
                    disabled={isSubmitting}
                  >
                    <Text
                      style={[
                        styles.urgencyLabel,
                        urgency === level.value && {
                          color: level.color,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {level.label}
                    </Text>
                    <Text
                      style={[
                        styles.urgencyDescription,
                        urgency === level.value && { color: level.color },
                      ]}
                    >
                      {level.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reward */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Reward <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWithIcon}>
                <DollarSign
                  size={20}
                  color={BrandColors.subtitle}
                  strokeWidth={2}
                />
                <TextInput
                  style={[
                    styles.inputText,
                    errors.reward && styles.inputTextError,
                  ]}
                  value={formatReward(rewardCents)}
                  onChangeText={handleRewardChange}
                  placeholder="5.00"
                  placeholderTextColor={BrandColors.subtitle}
                  keyboardType="decimal-pad"
                  editable={!isSubmitting}
                />
              </View>
              {errors.reward && (
                <Text style={styles.errorText}>{errors.reward}</Text>
              )}
              <Text style={styles.helperText}>
                How much will you pay the helper?
              </Text>
            </View>

            {/* Estimated Time */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Estimated Time <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWithIcon}>
                <Clock
                  size={20}
                  color={BrandColors.subtitle}
                  strokeWidth={2}
                />
                <TextInput
                  style={[
                    styles.inputText,
                    errors.estimatedMinutes && styles.inputTextError,
                  ]}
                  value={estimatedMinutes.toString()}
                  onChangeText={handleEstimatedTimeChange}
                  placeholder="30"
                  placeholderTextColor={BrandColors.subtitle}
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                />
                <Text style={styles.inputSuffix}>minutes</Text>
              </View>
              {errors.estimatedMinutes && (
                <Text style={styles.errorText}>{errors.estimatedMinutes}</Text>
              )}
              <Text style={styles.helperText}>
                How long do you think this will take?
              </Text>
            </View>

            {/* Moderation Error */}
            {errors.moderation && (
              <View style={styles.moderationError}>
                <AlertTriangle
                  size={20}
                  color={BrandColors.red}
                  strokeWidth={2}
                />
                <Text style={styles.moderationErrorText}>
                  {errors.moderation}
                </Text>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <CheckoutForm
              amount={rewardCents}
              isFormValid={isFormValid}
              submitTask={submitTask}
              category={initialCategory}
            />
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BrandColors.primary,
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
    fontSize: 18,
    fontWeight: '600',
    color: BrandColors.surface,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  categoryHeader: {
    marginBottom: 24,
    overflow: 'hidden',
  },
  categoryGradient: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: BrandColors.surface,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  categoryDescription: {
    fontSize: 16,
    color: BrandColors.surface,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  form: {
    paddingHorizontal: 24,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.title,
  },
  required: {
    color: BrandColors.red,
  },
  input: {
    borderWidth: 1,
    borderColor: BrandColors.divider,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: BrandColors.title,
    backgroundColor: BrandColors.surface,
    minHeight: 56,
  },
  inputError: {
    borderColor: BrandColors.red,
  },
  textArea: {
    borderWidth: 1,
    borderColor: BrandColors.divider,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: BrandColors.title,
    backgroundColor: BrandColors.surface,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BrandColors.divider,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: BrandColors.surface,
    gap: 12,
    minHeight: 56,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: BrandColors.title,
  },
  inputTextError: {
    color: BrandColors.red,
  },
  inputSuffix: {
    fontSize: 16,
    color: BrandColors.subtitle,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: BrandColors.red,
    marginTop: 4,
  },
  helperText: {
    fontSize: 14,
    color: BrandColors.subtitle,
    marginTop: 4,
  },
  urgencyContainer: {
    gap: 12,
  },
  urgencyOption: {
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: BrandColors.surface,
  },
  activeUrgencyOption: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  urgencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.title,
    marginBottom: 4,
  },
  urgencyDescription: {
    fontSize: 14,
    color: BrandColors.subtitle,
  },
  moderationError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.red + '15',
    borderWidth: 1,
    borderColor: BrandColors.red + '30',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  moderationErrorText: {
    flex: 1,
    fontSize: 16,
    color: BrandColors.red,
    fontWeight: '600',
  },
  submitSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
});