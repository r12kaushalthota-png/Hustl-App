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
  Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, Clock, Store, Package, Zap, CircleAlert as AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { TaskRepo } from '@/lib/taskRepo';
import { FoodOrderProvider, useFoodOrder } from '@/contexts/FoodOrderContext';
import { TaskCategory, TaskUrgency } from '@/types/database';
import { ModerationService } from '@/lib/moderation';
import AuthPrompt from '@components/AuthPrompt';
import TaskSuccessSheet from '@components/TaskSuccessSheet';
import Toast from '@components/Toast';
import MenuBrowser from '@/components/food/MenuBrowser';
import CartSummary from '@/components/food/CartSummary';
import { FoodOrderUtils } from '@/lib/foodOrderUtils';

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
const validateField = (field: string, value: string | PlaceData | null): string => {
  switch (field) {
    case 'title':
      if (!value || typeof value !== 'string') return 'Task title is required';
      if (value.trim().length < 3) return 'Title must be at least 3 characters';
      return '';
    case 'category':
      return !value ? 'Please select a category' : '';
    case 'store':
      if (!value || typeof value !== 'object' || !value.place_id) {
        return 'Please choose a location from the list';
      }
      return '';
    case 'dropoffAddress':
      if (!value || typeof value !== 'object' || !value.place_id) {
        return 'Please choose a location from the list';
      }
      return '';
    case 'estimatedMinutes':
      if (!value || typeof value !== 'string') return 'Estimated time is required';
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
  return (
    <FoodOrderProvider>
      <PostScreenContent />
    </FoodOrderProvider>
  );
}

function PostScreenContent() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const { getCartSummary, getFinalOrder, clearCart } = useFoodOrder();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [store, setStore] = useState<PlaceData | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState<PlaceData | null>(null);
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
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [lastCreatedTaskId, setLastCreatedTaskId] = useState<string | null>(null);
  const [showMenuBrowser, setShowMenuBrowser] = useState(false);
  const [isLoadingStore, setIsLoadingStore] = useState(false);
  const [isLoadingDropoff, setIsLoadingDropoff] = useState(false);
  const [moderationError, setModerationError] = useState('');

  // Toast state
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  // Handle category prefilling from navigation params
  useEffect(() => {
    const categoryParam = params.category as string;
    if (categoryParam && categoryParam !== prefilledCategory) {
      const defaults = getCategoryDefaults(categoryParam);
      
      // Prefill form with category defaults
      setTitle(defaults.title);
      setDescription(defaults.description);
      setCategory(categoryParam);
      setEstimatedMinutes(defaults.estimatedMinutes);
      setUrgency(defaults.urgency);
      setPrefilledCategory(categoryParam);
      
      // Clear other fields
      setStore(null);
      setDropoffAddress(null);
      setDropoffInstructions('');
      setFieldErrors({});
      setSubmitError('');
      
      // Show toast
      const categoryLabel = categories.find(cat => cat.value === categoryParam)?.label || 'Category';
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
    
    // Add food order total if exists
    const foodOrder = getFinalOrder();
    if (foodOrder && category === 'food') {
      total += foodOrder.total;
    }
    
    // Round up to nearest $0.25 (25 cents)
    total = Math.ceil(total / 25) * 25;
    
    // Clamp between min and max
    total = Math.max(MIN_PRICE_CENTS, Math.min(MAX_PRICE_CENTS, total));
    
    setComputedPriceCents(total);
  }, [urgency, getFinalOrder, category]);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const updateFieldError = (field: string, value: string | PlaceData | null) => {
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
    const requiredFields = {
      title,
      category,
      store,
      dropoffAddress,
      estimatedMinutes,
      urgency,
    };

    // Check if all required fields have values
    const hasAllValues = title.trim().length >= 3 &&
      category &&
      store?.place_id &&
      dropoffAddress?.place_id &&
      estimatedMinutes.trim() &&
      urgency;
    
    // For food category, require at least one item in cart
    if (category === 'food') {
      const cartSummary = getCartSummary();
      if (cartSummary.itemCount === 0) {
        return false;
      }
    }
    
    // Check if any field has validation errors
    const hasErrors = Object.values(fieldErrors).some(error => error);
    
    // Check for moderation errors
    const hasModerationError = moderationError.length > 0;
    
    return hasAllValues && !hasErrors && !hasModerationError && !isLoading;
  };

  const handlePlaceSelect = async (
    data: any, 
    details: any, 
    type: 'store' | 'dropoff'
  ) => {
    const placeData: PlaceData = {
      place_id: data.place_id,
      description: data.description,
      latitude: details?.geometry?.location?.lat,
      longitude: details?.geometry?.location?.lng,
    };

    if (type === 'store') {
      setStore(placeData);
      updateFieldError('store', placeData);
    } else {
      setDropoffAddress(placeData);
      updateFieldError('dropoffAddress', placeData);
    }
  };

  const handleSubmit = async () => {
    triggerHaptics();
    Keyboard.dismiss();

    // Check authentication
    if (isGuest || !user) {
      setShowAuthPrompt(true);
      return;
    }

    // Clear previous errors
    setSubmitError('');
    setModerationError('');

    // Final validation of all fields
    const errors: Record<string, string> = {};
    errors.title = validateField('title', title);
    errors.category = validateField('category', category);
    errors.store = validateField('store', store);
    errors.dropoffAddress = validateField('dropoffAddress', dropoffAddress);
    errors.estimatedMinutes = validateField('estimatedMinutes', estimatedMinutes);
    errors.urgency = validateField('urgency', urgency);

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
        store: store!.description,
        dropoff_address: dropoffAddress!.description,
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

      // Success - store the created task ID and show success screen
      setLastCreatedTaskId(data.id);
      
      // Add to tasks list if available
      if ((global as any).addNewTaskToTasksList) {
        (global as any).addNewTaskToTasksList(data);
      }
      
      setShowSuccessSheet(true);
      
      // Clear form for next use
      clearForm();
    } catch (error) {
      console.error('Error creating task:', error);
      setSubmitError("Couldn't post your task. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setStore(null);
    setDropoffAddress(null);
    setDropoffInstructions('');
    setUrgency('medium');
    setEstimatedMinutes('');
    setFieldErrors({});
    setSubmitError('');
    setModerationError('');
    clearCart();
  };

  const mapCategoryToDatabase = (category: string): TaskCategory => {
    const mapping: Record<string, TaskCategory> = {
      'food': 'food',
      'coffee': 'coffee',
      'grocery': 'grocery',
    };
    return mapping[category] || 'food';
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post a Task</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Form Content */}
        <View style={styles.formContainer}>
          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>What do you need?</Text>
            <TextInput
              style={[styles.input, fieldErrors.title && styles.inputError]}
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                updateFieldError('title', text);
              }}
              placeholder="e.g., Pick up my Chipotle order"
              placeholderTextColor={Colors.text.secondary}
              maxLength={100}
            />
            {fieldErrors.title && (
              <Text style={styles.errorText}>{fieldErrors.title}</Text>
            )}
          </View>

          {/* Category Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    category === cat.value && styles.categoryChipSelected
                  ]}
                  onPress={() => {
                    setCategory(cat.value);
                    updateFieldError('category', cat.value);
                    triggerHaptics();
                  }}
                >
                  <Text style={[
                    styles.categoryChipText,
                    category === cat.value && styles.categoryChipTextSelected
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {fieldErrors.category && (
              <Text style={styles.errorText}>{fieldErrors.category}</Text>
            )}
          </View>

          {/* Store Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Store size={16} color={Colors.text.primary} /> Store/Location
            </Text>
            <GooglePlacesAutocomplete
              placeholder="Search for a store or restaurant..."
              onPress={(data, details) => handlePlaceSelect(data, details, 'store')}
              query={{
                key: 'YOUR_GOOGLE_PLACES_API_KEY',
                language: 'en',
                types: 'establishment',
              }}
              styles={{
                container: styles.autocompleteContainer,
                textInput: [styles.input, fieldErrors.store && styles.inputError],
                listView: styles.autocompleteList,
                row: styles.autocompleteRow,
                description: styles.autocompleteText,
              }}
              enablePoweredByContainer={false}
              fetchDetails={true}
              debounce={300}
            />
            {fieldErrors.store && (
              <Text style={styles.errorText}>{fieldErrors.store}</Text>
            )}
          </View>

          {/* Menu Browser for Food Category */}
          {category === 'food' && store && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Package size={16} color={Colors.text.primary} /> Order Details
              </Text>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setShowMenuBrowser(true)}
              >
                <Text style={styles.menuButtonText}>Browse Menu & Add Items</Text>
              </TouchableOpacity>
              <CartSummary />
            </View>
          )}

          {/* Dropoff Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <MapPin size={16} color={Colors.text.primary} /> Dropoff Location
            </Text>
            <GooglePlacesAutocomplete
              placeholder="Where should we deliver?"
              onPress={(data, details) => handlePlaceSelect(data, details, 'dropoff')}
              query={{
                key: 'YOUR_GOOGLE_PLACES_API_KEY',
                language: 'en',
              }}
              styles={{
                container: styles.autocompleteContainer,
                textInput: [styles.input, fieldErrors.dropoffAddress && styles.inputError],
                listView: styles.autocompleteList,
                row: styles.autocompleteRow,
                description: styles.autocompleteText,
              }}
              enablePoweredByContainer={false}
              fetchDetails={true}
              debounce={300}
            />
            {fieldErrors.dropoffAddress && (
              <Text style={styles.errorText}>{fieldErrors.dropoffAddress}</Text>
            )}
          </View>

          {/* Dropoff Instructions */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Delivery Instructions (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={dropoffInstructions}
              onChangeText={setDropoffInstructions}
              placeholder="e.g., Leave at front desk, Ring doorbell..."
              placeholderTextColor={Colors.text.secondary}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Additional Details (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                updateFieldError('description', text);
              }}
              placeholder="Any special instructions or preferences..."
              placeholderTextColor={Colors.text.secondary}
              multiline
              numberOfLines={3}
              maxLength={300}
            />
          </View>

          {/* Time Estimate */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Clock size={16} color={Colors.text.primary} /> Estimated Time (minutes)
            </Text>
            <TextInput
              style={[styles.input, fieldErrors.estimatedMinutes && styles.inputError]}
              value={estimatedMinutes}
              onChangeText={(text) => {
                setEstimatedMinutes(text);
                updateFieldError('estimatedMinutes', text);
              }}
              placeholder="20"
              placeholderTextColor={Colors.text.secondary}
              keyboardType="numeric"
              maxLength={3}
            />
            {fieldErrors.estimatedMinutes && (
              <Text style={styles.errorText}>{fieldErrors.estimatedMinutes}</Text>
            )}
          </View>

          {/* Urgency Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Zap size={16} color={Colors.text.primary} /> Urgency Level
            </Text>
            <View style={styles.urgencyContainer}>
              {urgencyOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.urgencyOption,
                    urgency === option.value && styles.urgencyOptionSelected
                  ]}
                  onPress={() => {
                    setUrgency(option.value);
                    updateFieldError('urgency', option.value);
                    triggerHaptics();
                  }}
                >
                  <Text style={[
                    styles.urgencyOptionText,
                    urgency === option.value && styles.urgencyOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {option.price > 0 && (
                    <Text style={[
                      styles.urgencyPrice,
                      urgency === option.value && styles.urgencyPriceSelected
                    ]}>
                      +${(option.price / 100).toFixed(2)}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {fieldErrors.urgency && (
              <Text style={styles.errorText}>{fieldErrors.urgency}</Text>
            )}
          </View>

          {/* Price Display */}
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Total Reward</Text>
            <Text style={styles.priceValue}>
              ${(computedPriceCents / 100).toFixed(2)}
            </Text>
          </View>

          {/* Error Messages */}
          {moderationError && (
            <View style={styles.errorContainer}>
              <AlertCircle size={16} color={Colors.error} />
              <Text style={styles.errorMessage}>{moderationError}</Text>
            </View>
          )}

          {submitError && (
            <View style={styles.errorContainer}>
              <AlertCircle size={16} color={Colors.error} />
              <Text style={styles.errorMessage}>{submitError}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            !isFormValid() && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid()}
          accessibilityRole="button"
          accessibilityLabel="Post task"
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>
              Post Task • ${(computedPriceCents / 100).toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {showAuthPrompt && (
        <AuthPrompt
          visible={showAuthPrompt}
          onClose={() => setShowAuthPrompt(false)}
          message="Sign up to post tasks and start earning!"
        />
      )}

      {showSuccessSheet && lastCreatedTaskId && (
        <TaskSuccessSheet
          visible={showSuccessSheet}
          onClose={() => {
            setShowSuccessSheet(false);
            router.back();
          }}
          taskId={lastCreatedTaskId}
        />
      )}

      {showMenuBrowser && store && (
        <MenuBrowser
          visible={showMenuBrowser}
          onClose={() => setShowMenuBrowser(false)}
          storeName={store.description}
        />
      )}

      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  formContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginTop: 4,
  },
  categoryScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: 'white',
  },
  autocompleteContainer: {
    flex: 0,
  },
  autocompleteList: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    marginTop: 4,
  },
  autocompleteRow: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  autocompleteText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  menuButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  menuButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  urgencyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
  },
  urgencyOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  urgencyOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  urgencyOptionTextSelected: {
    color: 'white',
  },
  urgencyPrice: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  urgencyPriceSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  priceContainer: {
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.error,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorMessage: {
    flex: 1,
    color: Colors.error,
    fontSize: 14,
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.text.disabled,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});