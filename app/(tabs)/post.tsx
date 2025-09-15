import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Platform, 
  KeyboardAvoidingView, 
  ActivityIndicator,
  Keyboard,
  Dimensions,
  SafeAreaView,
  Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { X, MapPin, Clock, Store, Package, Zap, CircleAlert as AlertCircle, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { TaskRepo } from '@/lib/taskRepo';
import { TaskCategory, TaskUrgency } from '@/types/database';
import { ModerationService } from '@/lib/moderation';
import Toast from '@components/Toast';
import CheckoutForm from '@/components/Checkout-form.native';

const { width } = Dimensions.get('window');

// Extended categories to support all card types
const categories: { value: string; label: string }[] = [
  { value: 'food', label: 'Food Pickup' },
  { value: 'coffee', label: 'Coffee Run' },
  { value: 'grocery', label: 'Grocery Shopping' },
  { value: 'study', label: 'Study Partner' },
  { value: 'workout', label: 'Workout Buddy' },
  { value: 'transport', label: 'Campus Rides' },
  { value: 'gaming', label: 'Gaming Partner' },
  { value: 'tutoring', label: 'Tutoring' },
  { value: 'events', label: 'Event Buddy' },
  { value: 'photography', label: 'Photography' },
  { value: 'repair', label: 'Tech Repair' },
  { value: 'laundry', label: 'Laundry Help' },
];

const urgencyOptions: { value: string; label: string; price: number }[] = [
  { value: 'low', label: 'Low', price: 0 },
  { value: 'medium', label: 'Medium', price: 100 }, // $1.00 in cents
  { value: 'high', label: 'High', price: 250 }, // $2.50 in cents
];

// Common campus locations
const campusLocations = [
  // Food & Restaurants
  'Chick-fil-A (Reitz Union)',
  'Panda Express (Reitz Union)',
  'Subway (Reitz Union)',
  'Starbucks (Library West)',
  'Starbucks (Reitz Union)',
  'Dunkin\' (Turlington)',
  'Chipotle (Midtown)',
  'Taco Bell (Archer Road)',
  'McDonald\'s (Archer Road)',
  'Publix (Butler Plaza)',
  'Target (Butler Plaza)',
  'Walmart (Archer Road)',
  'CVS Pharmacy (13th Street)',
  'Walgreens (University Avenue)',
  // Campus Buildings
  'Reitz Union',
  'Library West',
  'Marston Science Library',
  'Student Recreation Center',
  'Plaza of the Americas',
  'Turlington Hall',
  'Little Hall',
  'Gator Corner Dining Center',
  'Fresh Food Company',
  'Broward Dining',
  // Off-Campus Popular
  'Midtown Gainesville',
  'Butler Plaza',
  'Oaks Mall',
  'Archer Road',
  'University Avenue',
];

const dropoffLocations = [
  // Residence Halls
  'Broward Hall',
  'Rawlings Hall',
  'Jennings Hall',
  'Yulee Hall',
  'Reid Hall',
  'Murphree Hall',
  'Fletcher Hall',
  'Sledd Hall',
  'Thomas Hall',
  'Buckman Hall',
  'East Hall',
  'Tolbert Hall',
  'Weaver Hall',
  'Keys Complex',
  'Lakeside Complex',
  'Springs Complex',
  'Infinity Hall',
  'Cypress Hall',
  'Poplar Hall',
  'Magnolia Hall',
  'Palmetto Hall',
  // Campus Buildings
  'Reitz Union',
  'Library West',
  'Marston Science Library',
  'Student Recreation Center',
  'Plaza of the Americas',
  'Turlington Hall',
  'Little Hall',
  'Gator Corner Dining Center',
  'Fresh Food Company',
  // Off-Campus Areas
  'Midtown Gainesville',
  'Butler Plaza',
  'Archer Road Apartments',
  'University Avenue',
  'SW 20th Avenue',
  'SW 34th Street',
];

const BASE_PRICE_CENTS = 150; // $1.50 base price
const MIN_PRICE_CENTS = 200; // $2.00 minimum
const MAX_PRICE_CENTS = 2500; // $25.00 maximum

interface PlaceData {
  place_id: string;
  description: string;
  latitude?: number;
  longitude?: number;
}

// Validation schema
const validateField = (field: string, value: string): string => {
  switch (field) {
    case 'title':
      if (!value) return 'Task title is required';
      if (value.trim().length < 3) return 'Title must be at least 3 characters';
      return '';
    case 'category':
      return !value ? 'Please select a category' : '';
    case 'store':
      if (!value || !value.trim()) {
        return 'Please select a store';
      }
      return '';
    case 'dropoffAddress':
      if (!value || !value.trim()) {
        return 'Please select a dropoff location';
      }
      return '';
    case 'estimatedMinutes':
      if (!value) return 'Estimated time is required';
      const minutes = Number(value);
      if (isNaN(minutes)) return 'Please enter a valid number';
      if (minutes < 5) return 'Minimum 5 minutes';
      if (minutes > 180) return 'Maximum 180 minutes';
      return '';
    case 'urgency':
      return !value ? 'Please select urgency level' : '';
    default:
      return '';
  }
};

// Category defaults for prefilling
const getCategoryDefaults = (categoryId: string) => {
  const defaults = {
    food: {
      title: 'Food pickup',
      description: 'Pick up my order and drop it off.',
      estimatedMinutes: '20',
      urgency: 'medium' as const,
    },
    coffee: {
      title: 'Coffee run',
      description: 'Grab a coffee and drop it off.',
      estimatedMinutes: '15',
      urgency: 'medium' as const,
    },
    grocery: {
      title: 'Grocery shopping',
      description: 'Pick up groceries and deliver.',
      estimatedMinutes: '30',
      urgency: 'low' as const,
    },
    study: {
      title: 'Study partner',
      description: 'Study session—subject/topic flexible.',
      estimatedMinutes: '60',
      urgency: 'low' as const,
    },
    workout: {
      title: 'Workout partner',
      description: 'Looking for a gym/sports buddy.',
      estimatedMinutes: '45',
      urgency: 'low' as const,
    },
    transport: {
      title: 'Need a ride',
      description: 'Quick campus ride. Can split gas if needed.',
      estimatedMinutes: '15',
      urgency: 'medium' as const,
    },
  };
  
  return defaults[categoryId as keyof typeof defaults] || {
    title: 'Custom task',
    description: 'Describe what you need help with.',
    estimatedMinutes: '20',
    urgency: 'medium' as const,
  };
};

export default function PostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, isGuest } = useAuth();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [store, setStore] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffInstructions, setDropoffInstructions] = useState('');
  const [urgency, setUrgency] = useState<string>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [prefilledCategory, setPrefilledCategory] = useState<string | null>(null);
  
  // Computed pricing
  const [computedPriceCents, setComputedPriceCents] = useState(BASE_PRICE_CENTS + 100); // Base + medium urgency
  
  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isLoadingStore, setIsLoadingStore] = useState(false);
  const [isLoadingDropoff, setIsLoadingDropoff] = useState(false);
  const [moderationError, setModerationError] = useState('');
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [showDropoffDropdown, setShowDropoffDropdown] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  // Calculate footer height for ScrollView padding
  const FOOTER_HEIGHT = 80; // Height of sticky footer
  const TOTAL_BOTTOM_SPACE = FOOTER_HEIGHT + tabBarHeight + insets.bottom + 24;

  // Handle category prefilling from navigation params
  useEffect(() => {
    const categoryParam = params.category as string;
    if (categoryParam && categoryParam !== prefilledCategory) {
      const defaults = getCategoryDefaults(categoryParam);
      const categoryLabel = categories.find(c => c.value === categoryParam)?.label || categoryParam;
      
      // Prefill form with category defaults
      setTitle(defaults.title);
      setDescription(defaults.description);
      setCategory(categoryParam);
      setEstimatedMinutes(defaults.estimatedMinutes);
      setUrgency(defaults.urgency);
      setPrefilledCategory(categoryParam);
      
      // Clear other fields
      setStore('');
      setDropoffAddress('');
      setDropoffInstructions('');
      setFieldErrors({});
      setSubmitError('');
      
      setToast({
        visible: true,
        message: `Prefilled from ${categoryLabel}`,
        type: 'success'
      });
    }
  }, [params.category, prefilledCategory]);

  // Calculate price whenever urgency changes
  useEffect(() => {
    const urgencyPrice = urgencyOptions.find(opt => opt.value === urgency)?.price || 100;
    let total = BASE_PRICE_CENTS + urgencyPrice;
    
    // Round up to nearest $0.25 (25 cents)
    total = Math.ceil(total / 25) * 25;
    
    // Clamp between min and max
    total = Math.max(MIN_PRICE_CENTS, Math.min(MAX_PRICE_CENTS, total));
    
    setComputedPriceCents(total);
  }, [urgency, category]);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const updateFieldError = (field: string, value: string) => {
    const error = validateField(field, value);
    setFieldErrors(prev => ({
      ...prev,
      [field]: error
    }));
    
    // Clear moderation error when user starts editing
    if (field === 'title' || field === 'description') {
      setModerationError('');
    }
  };

  const isFormValid = (): boolean => {
    // Check basic required fields
    const hasBasicFields = title.trim().length >= 3 &&
      category &&
      estimatedMinutes.trim() &&
      urgency;
    
    // Check location fields for location-based categories
    const locationCategories = ['food', 'coffee', 'grocery'];
    const needsLocation = locationCategories.includes(category);
    const hasLocationFields = !needsLocation || (store.trim() && dropoffAddress.trim());
    
    // Check if any field has validation errors
    const hasErrors = Object.values(fieldErrors).some(error => error);
    
    // Check for moderation errors
    const hasModerationError = moderationError.length > 0;
    
    return hasBasicFields && hasLocationFields && !hasErrors && !hasModerationError && !isLoading;
  };

  const handleStoreSelect = (location: string) => {
    setStore(location);
    updateFieldError('store', location);
    setShowStoreDropdown(false);
  };

  const handleDropoffSelect = (location: string) => {
    setDropoffAddress(location);
    updateFieldError('dropoffAddress', location);
    setShowDropoffDropdown(false);
  };

  // Store Selection Modal Component
  const StoreSelectionModal = () => (
    <Modal
      visible={showStoreDropdown}
      transparent
      animationType="fade"
      onRequestClose={() => setShowStoreDropdown(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowStoreDropdown(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Store</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowStoreDropdown(false)}
            >
              <X size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
            {campusLocations.map((location) => (
              <TouchableOpacity
                key={location}
                style={[
                  styles.modalItem,
                  (store && typeof store === 'string' && store === location) && styles.selectedModalItem
                ]}
                onPress={() => handleStoreSelect(location)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.modalItemText,
                  (store && typeof store === 'string' && store === location) && styles.selectedModalItemText
                ]}>
                  {location}
                </Text>
                {(store && typeof store === 'string' && store === location) && (
                  <Check size={16} color={Colors.primary} strokeWidth={2} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Dropoff Selection Modal Component
  const DropoffSelectionModal = () => (
    <Modal
      visible={showDropoffDropdown}
      transparent
      animationType="fade"
      onRequestClose={() => setShowDropoffDropdown(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowDropoffDropdown(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Drop-off Location</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowDropoffDropdown(false)}
            >
              <X size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
            {dropoffLocations.map((location) => (
              <TouchableOpacity
                key={location}
                style={[
                  styles.modalItem,
                  (dropoffAddress && typeof dropoffAddress === 'string' && dropoffAddress === location) && styles.selectedModalItem
                ]}
                onPress={() => handleDropoffSelect(location)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.modalItemText,
                  (dropoffAddress && typeof dropoffAddress === 'string' && dropoffAddress === location) && styles.selectedModalItemText
                ]}>
                  {location}
                </Text>
                {(dropoffAddress && typeof dropoffAddress === 'string' && dropoffAddress === location) && (
                  <Check size={16} color={Colors.primary} strokeWidth={2} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const handleSubmit = async () => {
    triggerHaptics();
    Keyboard.dismiss();

    // Check authentication
    if (isGuest || !user) {
      setToast({
        visible: true,
        message: 'Please sign in to post tasks',
        type: 'error'
      });
      return;
    }

    // Clear previous errors
    setSubmitError('');
    setModerationError('');

    // Final validation of all fields
    const errors: Record<string, string> = {};
    errors.title = validateField('title', title);
    errors.category = validateField('category', category);
    errors.estimatedMinutes = validateField('estimatedMinutes', estimatedMinutes);
    errors.urgency = validateField('urgency', urgency);

    // Only validate store and dropoff for location-based categories
    const locationCategories = ['food', 'coffee', 'grocery'];
    if (locationCategories.includes(category)) {
      errors.store = validateField('store', store);
      errors.dropoffAddress = validateField('dropoffAddress', dropoffAddress);
    }

    // Remove empty errors
    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key];
    });

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    // Content moderation check
    const moderationResult = ModerationService.moderateTask(title, description);
    if (!moderationResult.isAllowed) {
      setModerationError(moderationResult.message || 'Content not allowed');
      return;
    }

    // Prevent double submits
    if (isLoading) return;

    setIsLoading(true);

    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        category: mapCategoryToDatabase(category),
        store: store.trim(),
        dropoff_address: dropoffAddress.trim(),
        dropoff_instructions: dropoffInstructions.trim(),
        urgency: urgency as TaskUrgency,
        estimated_minutes: Number(estimatedMinutes),
        reward_cents: computedPriceCents,
      };

      const { data, error: createError } = await TaskRepo.createTask(taskData, user.id);

      if (createError) {
        setSubmitError("Couldn't post your task. Try again.");
        return;
      }

      if (!data || !data.id) {
        setSubmitError("Couldn't post your task. Try again.");
        return;
      }

      // Success
      setToast({
        visible: true,
        message: 'Task posted successfully!',
        type: 'success'
      });
      
      // Clear form for next use
      clearForm();

      // Navigate back to tasks
      setTimeout(() => {
        router.push('/(tabs)/tasks');
      }, 1500);
    } catch (error) {
      setSubmitError("Couldn't post your task. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setStore('');
    setDropoffAddress('');
    setDropoffInstructions('');
    setUrgency('medium');
    setEstimatedMinutes('');
    setFieldErrors({});
    setSubmitError('');
    setModerationError('');
    setShowStoreDropdown(false);
    setShowDropoffDropdown(false);
  };

  // Map UI categories to database categories
  const mapCategoryToDatabase = (uiCategory: string): TaskCategory => {
    const mapping: Record<string, TaskCategory> = {
      food: 'food',
      coffee: 'coffee',
      grocery: 'grocery',
      study: 'food', // Map to existing category for now
      workout: 'food', // Map to existing category for now
      transport: 'food', // Map to existing category for now
      gaming: 'food', // Map to existing category for now
      tutoring: 'food', // Map to existing category for now
      events: 'food', // Map to existing category for now
      photography: 'food', // Map to existing category for now
      repair: 'food', // Map to existing category for now
      laundry: 'food', // Map to existing category for now
    };
    return mapping[uiCategory] || 'food';
  };

  // Hide toast
  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const formatPrice = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const CategorySelector = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Category *</Text>
      <View style={styles.categoryGrid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryPill,
              category === cat.value && styles.activeCategoryPill
            ]}
            onPress={() => {
              triggerHaptics();
              setCategory(cat.value);
              updateFieldError('category', cat.value);
            }}
            disabled={isLoading}
            accessibilityLabel={`Select ${cat.label} category`}
            accessibilityRole="button"
          >
            <Text style={[
              styles.categoryPillText,
              category === cat.value && styles.activeCategoryPillText
            ]} numberOfLines={1}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {fieldErrors.category && (
        <Text style={styles.fieldError}>{fieldErrors.category}</Text>
      )}
    </View>
  );

  const UrgencySelector = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Urgency *</Text>
      <View style={styles.segmentedControl}>
        {urgencyOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.segment,
              urgency === option.value && styles.activeSegment
            ]}
            onPress={() => {
              triggerHaptics();
              setUrgency(option.value);
              updateFieldError('urgency', option.value);
            }}
            disabled={isLoading}
            accessibilityLabel={`Select ${option.label} urgency`}
            accessibilityRole="button"
          >
            <Text style={[
              styles.segmentText,
              urgency === option.value && styles.activeSegmentText
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {fieldErrors.urgency && (
        <View>
          <Text style={styles.fieldError}>{fieldErrors.urgency}</Text>
        </View>
      )}
    </View>
  );

  const PricingBreakdown = () => {
    const urgencyPrice = urgencyOptions.find(opt => opt.value === urgency)?.price || 100;
    
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Computed Total</Text>
        <View style={styles.pricingCard}>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Base</Text>
            <Text style={styles.pricingValue}>{formatPrice(BASE_PRICE_CENTS)}</Text>
          </View>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Urgency ({urgency})</Text>
            <Text style={styles.pricingValue}>+{formatPrice(urgencyPrice)}</Text>
          </View>
          <View style={[styles.pricingRow, styles.pricingTotal]}>
            <Text style={styles.pricingTotalLabel}>Total</Text>
            <Text style={styles.pricingTotalValue}>{formatPrice(computedPriceCents)}</Text>
          </View>
        </View>
      </View>
    );
  };


  return (
    <>
      <SafeAreaView style={styles.container}>
      <View style={[styles.innerContainer, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <X size={24} color={Colors.white} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Task</Text>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 20}
        >
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: TOTAL_BOTTOM_SPACE }
            ]}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={false}
          >
            <View style={styles.form}>
              {/* Prefilled Category Chip */}
              {prefilledCategory && (
                <View style={styles.prefilledChip}>
                  <Text style={styles.prefilledChipText}>
                    Prefilled from {categories.find(c => c.value === prefilledCategory)?.label}
                  </Text>
                </View>
              )}

              {/* Submit Error */}
              {submitError ? (
                <View style={styles.submitErrorContainer}>
                  <AlertCircle size={20} color={Colors.semantic.errorAlert} strokeWidth={2} />
                  <Text style={styles.submitErrorText}>{submitError}</Text>
                </View>
              ) : null}

              {/* Moderation Error */}
              {moderationError ? (
                <View style={styles.moderationErrorContainer}>
                  <AlertCircle size={20} color={Colors.semantic.errorAlert} strokeWidth={2} />
                  <Text style={styles.moderationErrorText}>{moderationError}</Text>
                </View>
              ) : null}

              {/* Task Details Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Task Details</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Task Title *</Text>
                  <TextInput
                    style={[styles.input, fieldErrors.title && styles.inputError]}
                    value={title}
                    onChangeText={(value) => {
                      setTitle(value);
                      updateFieldError('title', value);
                    }}
                    onBlur={() => updateFieldError('title', title)}
                    placeholder="What do you need help with?"
                    placeholderTextColor={Colors.semantic.tabInactive}
                    editable={!isLoading}
                    returnKeyType="done"
                    accessibilityLabel="Task title"
                  />
                  {fieldErrors.title && (
                    <Text style={styles.fieldError}>{fieldErrors.title}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Provide more details about the task..."
                    placeholderTextColor={Colors.semantic.tabInactive}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={!isLoading}
                    returnKeyType="done"
                    accessibilityLabel="Task description"
                  />
                </View>

                <CategorySelector />

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Store *</Text>
                  <View style={[styles.inputWithIcon, fieldErrors.store && styles.inputError]}>
                    <Store size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                    <TextInput
                      style={styles.inputText}
                      value={store}
                      onChangeText={(value) => {
                        setStore(value);
                        updateFieldError('store', value);
                      }}
                      onBlur={() => updateFieldError('store', store)}
                      placeholder="e.g. Chick-fil-A, Starbucks, Chipotle"
                      placeholderTextColor={Colors.semantic.tabInactive}
                      editable={!isLoading}
                      returnKeyType="done"
                      accessibilityLabel="Store name"
                    />
                  </View>
                  
                  {fieldErrors.store && (
                    <Text style={styles.fieldError}>{fieldErrors.store}</Text>
                  )}
                </View>
              </View>

              {/* Drop-off Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Drop-off</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Drop-off Address *</Text>
                  <View style={[styles.inputWithIcon, fieldErrors.dropoffAddress && styles.inputError]}>
                    <MapPin size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                    <TextInput
                      style={styles.inputText}
                      value={dropoffAddress}
                      onChangeText={(value) => {
                        setDropoffAddress(value);
                        updateFieldError('dropoffAddress', value);
                      }}
                      onBlur={() => updateFieldError('dropoffAddress', dropoffAddress)}
                      placeholder="e.g. Broward Hall, Library West, Reitz Union"
                      placeholderTextColor={Colors.semantic.tabInactive}
                      editable={!isLoading}
                      returnKeyType="done"
                      accessibilityLabel="Drop-off address"
                    />
                  </View>
                  
                  {fieldErrors.dropoffAddress && (
                    <Text style={styles.fieldError}>{fieldErrors.dropoffAddress}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Drop-off Instructions</Text>
                  <View style={styles.inputWithIcon}>
                    <Package size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                    <TextInput
                      style={styles.inputText}
                      value={dropoffInstructions}
                      onChangeText={setDropoffInstructions}
                      placeholder="Any special delivery instructions?"
                      placeholderTextColor={Colors.semantic.tabInactive}
                      editable={!isLoading}
                      returnKeyType="done"
                      accessibilityLabel="Drop-off instructions"
                    />
                  </View>
                </View>
              </View>

              {/* Timing & Urgency Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Timing & Urgency</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Estimated Time *</Text>
                  <View style={[styles.inputWithIcon, fieldErrors.estimatedMinutes && styles.inputError]}>
                    <Clock size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                    <TextInput
                      style={styles.inputText}
                      value={estimatedMinutes}
                      onChangeText={(value) => {
                        setEstimatedMinutes(value);
                        updateFieldError('estimatedMinutes', value);
                      }}
                      onBlur={() => updateFieldError('estimatedMinutes', estimatedMinutes)}
                      placeholder="30"
                      placeholderTextColor={Colors.semantic.tabInactive}
                      keyboardType="number-pad"
                      editable={!isLoading}
                      returnKeyType="done"
                      accessibilityLabel="Estimated time in minutes"
                    />
                  </View>
                  <Text style={styles.helperText}>in minutes</Text>
                  {fieldErrors.estimatedMinutes && (
                    <Text style={styles.fieldError}>{fieldErrors.estimatedMinutes}</Text>
                  )}
                </View>

                <UrgencySelector />
              </View>

              {/* Pricing Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pricing</Text>
                <PricingBreakdown />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      
      {/* Fixed Footer - Always Visible Above Tab Bar */}
      <View style={[
        styles.stickyFooter,
        {
          bottom: tabBarHeight + insets.bottom + 8,
          paddingBottom: 16,
        }
      ]}>
        {/* <TouchableOpacity
          style={[
            styles.submitButton,
            (!isFormValid() || isLoading) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid() || isLoading}
          accessibilityLabel="Post Task"
          accessibilityRole="button"
        >
          {isFormValid() && !isLoading ? (
            <LinearGradient
              colors={['#0047FF', '#0021A5']}
              style={styles.submitButtonGradient}
            >
              <Zap size={18} color={Colors.white} strokeWidth={2.5} fill={Colors.white} />
              <Text style={styles.submitButtonText}>Post Task</Text>
            </LinearGradient>
          ) : (
            <View style={styles.disabledButtonContent}>
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.disabledButtonText}>Post Task</Text>
              )}
            </View>
          )}
        </TouchableOpacity> */}
        <CheckoutForm amount={computedPriceCents} isFormValid={isFormValid} submitTask={handleSubmit} />
      </View>

      {/* Store Selection Modal */}
      <StoreSelectionModal />

      {/* Dropoff Selection Modal */}
      <DropoffSelectionModal />


      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white + '33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  form: {
    gap: 24,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 4,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.semantic.inputText,
    backgroundColor: Colors.white,
    minHeight: 44,
  },
  inputError: {
    borderColor: Colors.semantic.errorAlert,
  },
  textArea: {
    height: 80,
    paddingTop: 16,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    minHeight: 44,
    backgroundColor: Colors.white,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.inputText,
  },
  inputIcon: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    marginTop: 4,
  },
  fieldError: {
    fontSize: 14,
    color: Colors.semantic.errorAlert,
    marginTop: 4,
  },
  
  // Category Pills Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryPill: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: (width - 64) / 3 - 8, // 3 columns with gaps
    maxWidth: (width - 64) / 2 - 6, // 2 columns fallback
  },
  activeCategoryPill: {
    backgroundColor: '#0021A5',
    borderColor: '#0021A5',
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.bodyText,
    textAlign: 'center',
  },
  activeCategoryPillText: {
    color: Colors.white,
    fontWeight: '600',
  },

  // Google Places Autocomplete
  autocompleteContainer: {
    position: 'relative',
    zIndex: 1,
  },
  placesContainer: {
    flex: 0,
  },
  placesInputContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: Colors.white,
    paddingHorizontal: 0,
  },
  placesInput: {
    fontSize: 16,
    color: Colors.semantic.inputText,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 44,
  },
  placesList: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: Colors.white,
    maxHeight: 200,
  },
  placesRow: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  placesDescription: {
    fontSize: 14,
    color: Colors.semantic.bodyText,
  },
  placesLoader: {
    backgroundColor: Colors.white,
    paddingVertical: 16,
  },
  placesEmpty: {
    backgroundColor: Colors.white,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  placesEmptyText: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
  },
  manualStoreButton: {
    backgroundColor: Colors.muted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  manualStoreText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  manualDropoffButton: {
    backgroundColor: Colors.muted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  manualDropoffText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },

  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  activeSegment: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.tabInactive,
  },
  activeSegmentText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  pricingCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingLabel: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
  },
  pricingValue: {
    fontSize: 14,
    color: Colors.semantic.bodyText,
    fontWeight: '500',
  },
  pricingTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 4,
  },
  pricingTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
  pricingTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  submitErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  submitErrorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.errorAlert,
    lineHeight: 20,
  },
  prefilledChip: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'center',
    marginBottom: 16,
  },
  prefilledChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Fixed Footer - Always Above Tab Bar
  stickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 231, 235, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 100,
    zIndex: 100,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 56,
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
    minHeight: 56,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledButtonContent: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  disabledButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  moderationErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  moderationErrorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.errorAlert,
    lineHeight: 20,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    minHeight: 44,
    backgroundColor: Colors.white,
  },
  dropdownButtonActive: {
    borderColor: Colors.primary + '40',
  },
  dropdownButtonText: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.inputText,
  },
  placeholderText: {
    color: Colors.semantic.tabInactive,
  },
  dropdownArrow: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  selectedModalItem: {
    backgroundColor: Colors.primary + '10',
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.semantic.bodyText,
    flex: 1,
  },
  selectedModalItemText: {
    color: Colors.primary,
    fontWeight: '600',
  },
});