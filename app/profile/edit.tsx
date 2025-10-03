import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, User, GraduationCap, Mail, MapPin, CircleAlert as AlertCircle, Save } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/theme/colors';
import { useEditProfileForm } from '@/hooks/useEditProfileForm';
import { ProfileRepo } from '@/lib/profileRepo';
import YearSelector from '@/components/YearSelector';
import MajorSelector from '@/components/MajorSelector';
import Toast from '@/components/Toast';

// University of Florida majors catalog
const UF_MAJORS = [
  'Accounting',
  'Advertising',
  'Aerospace Engineering',
  'African American Studies',
  'Agricultural and Life Sciences',
  'Agricultural Education and Communication',
  'Animal Sciences',
  'Anthropology',
  'Applied Physiology and Kinesiology',
  'Architecture',
  'Art',
  'Art Education',
  'Art History',
  'Astronomy',
  'Biology',
  'Biomedical Engineering',
  'Botany',
  'Building Construction',
  'Business Administration',
  'Chemical Engineering',
  'Chemistry',
  'Civil Engineering',
  'Classical Studies',
  'Communication Sciences and Disorders',
  'Computer Engineering',
  'Computer Science',
  'Criminology',
  'Dance',
  'Dentistry',
  'Digital Arts and Sciences',
  'Economics',
  'Education',
  'Electrical Engineering',
  'Elementary Education',
  'Engineering',
  'English',
  'Environmental Engineering',
  'Environmental Science',
  'Family, Youth and Community Sciences',
  'Finance',
  'Fire and Emergency Services',
  'Food and Resource Economics',
  'Food Science and Human Nutrition',
  'Forest Resources and Conservation',
  'French',
  'Geography',
  'Geology',
  'German',
  'Graphic Design',
  'Health Education and Behavior',
  'Health Science',
  'History',
  'Horticultural Science',
  'Industrial and Systems Engineering',
  'Information Systems',
  'International Studies',
  'Italian',
  'Journalism',
  'Landscape Architecture',
  'Latin',
  'Linguistics',
  'Management',
  'Marketing',
  'Materials Science and Engineering',
  'Mathematics',
  'Mechanical Engineering',
  'Medicine',
  'Microbiology and Cell Science',
  'Music',
  'Music Education',
  'Natural Resource Conservation',
  'Nuclear Engineering',
  'Nursing',
  'Nutritional Sciences',
  'Pharmacy',
  'Philosophy',
  'Physics',
  'Political Science',
  'Psychology',
  'Public Health',
  'Public Relations',
  'Recreation, Parks and Tourism',
  'Religion',
  'Russian',
  'Sociology',
  'Soil and Water Sciences',
  'Spanish',
  'Special Education',
  'Statistics',
  'Sustainability Studies',
  'Theatre',
  'Tourism, Hospitality and Event Management',
  'Veterinary Medicine',
  'Wildlife Ecology and Conservation',
  'Women\'s Studies',
  'Zoology',
  'Other'
];

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const {
    formData,
    errors,
    isValid,
    isDirty,
    isLoading,
    isSaving,
    updateField,
    validateField,
    handleSave,
    handleDiscard,
    isEmailEditable,
  } = useEditProfileForm();
  
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

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
    if (isDirty) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. What would you like to do?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              handleDiscard();
              router.back();
            }
          },
          { text: 'Save', onPress: handleSaveAndBack },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else {
      router.back();
    }
  };

  const handleSaveAndBack = async () => {
    triggerHaptics();

    const result = await handleSave();

    if (result.success) {
      setToast({
        visible: true,
        message: 'Profile updated successfully!',
        type: 'success'
      });

      setTimeout(() => {
        router.back();
      }, 1500);
    } else {
      setToast({
        visible: true,
        message: result.error || 'Failed to save profile',
        type: 'error'
      });
    }
  };

  const handleQuickSave = async () => {
    triggerHaptics();
    
    const result = await handleSave();
    
    if (result.success) {
      setToast({
        visible: true,
        message: 'Profile saved!',
        type: 'success'
      });
    } else {
      setToast({
        visible: true,
        message: result.error || 'Failed to save profile',
        type: 'error'
      });
    }
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const handleFieldUpdate = (field: keyof typeof formData, value: string) => {
    updateField(field, value);
  };

  const handleFieldBlur = (field: keyof typeof formData) => {
    validateField(field);
  };

  const handleChangePhoto = () => {
    triggerHaptics();
    Alert.alert('Change Photo', 'Photo picker will be implemented soon!');
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity 
          style={[
            styles.saveButton,
            (!isDirty || !isValid || isSaving) && styles.saveButtonDisabled
          ]}
          onPress={handleQuickSave}
          disabled={!isDirty || !isValid || isSaving}
        >
          <Save size={16} color={isDirty && isValid && !isSaving ? Colors.white : Colors.semantic.tabInactive} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(formData.display_name || 'User')}
              </Text>
            </View>
            <TouchableOpacity style={styles.cameraButton} onPress={handleChangePhoto}>
              <Camera size={16} color={Colors.white} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleChangePhoto}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name</Text>
            <View style={styles.inputContainer}>
              <User size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              <TextInput
                style={[styles.input, errors.display_name && styles.inputError]}
                value={formData.display_name}
                onChangeText={(value) => handleFieldUpdate('display_name', value)}
                onBlur={() => handleFieldBlur('display_name')}
                placeholder="Enter your display name"
                placeholderTextColor={Colors.semantic.tabInactive}
                editable={!isSaving}
                returnKeyType="done"
              />
            </View>
            {errors.display_name && (
              <Text style={styles.errorText}>{errors.display_name}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Mail size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              <TextInput
                style={[
                  styles.input, 
                  errors.email && styles.inputError,
                  !isEmailEditable && styles.inputDisabled
                ]}
                value={formData.email}
                onChangeText={(value) => handleFieldUpdate('email', value)}
                onBlur={() => handleFieldBlur('email')}
                placeholder={isEmailEditable ? "Enter your email" : "Email from account"}
                placeholderTextColor={Colors.semantic.tabInactive}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={isEmailEditable && !isSaving}
                returnKeyType="done"
              />
            </View>
            {!isEmailEditable && (
              <Text style={styles.helperText}>Email is linked to your account and cannot be changed</Text>
            )}
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Major *</Text>
            <MajorSelector
              value={formData.major}
              onSelect={(value) => handleFieldUpdate('major', value)}
              error={errors.major}
              disabled={isSaving}
              majors={UF_MAJORS}
            />
            {errors.major && (
              <Text style={styles.errorText}>{errors.major}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Academic Year *</Text>
            <YearSelector
              value={formData.year}
              onSelect={(value) => handleFieldUpdate('year', value)}
              error={errors.year}
              disabled={isSaving}
            />
            {errors.year && (
              <Text style={styles.errorText}>{errors.year}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>University</Text>
            <View style={styles.inputContainer}>
              <MapPin size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              <TextInput
                style={styles.input}
                value="University of Florida"
                editable={false}
                placeholder="University of Florida"
                placeholderTextColor={Colors.semantic.tabInactive}
              />
            </View>
            <Text style={styles.helperText}>University cannot be changed</Text>
          </View>
        </View>
        
        {/* Save Button */}
        {isDirty && (
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity
              style={[
                styles.saveButtonLarge,
                (!isValid || isSaving) && styles.saveButtonLargeDisabled
              ]}
              onPress={handleSaveAndBack}
              disabled={!isValid || isSaving}
              accessibilityLabel="Save profile changes"
              accessibilityRole="button"
            >
              <Text style={[
                styles.saveButtonLargeText,
                (!isValid || isSaving) && styles.saveButtonLargeTextDisabled
              ]}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      
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
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white + '33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Colors.semantic.tabInactive + '33',
  },
  content: {
    flex: 1,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  changePhotoText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  form: {
    padding: 24,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: Colors.semantic.inputBackground,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.inputText,
  },
  inputError: {
    borderColor: Colors.semantic.errorAlert,
  },
  inputDisabled: {
    backgroundColor: Colors.muted,
    color: Colors.semantic.tabInactive,
  },
  errorText: {
    fontSize: 14,
    color: Colors.semantic.errorAlert,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    marginTop: 4,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
  },
  saveButtonContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.divider,
  },
  saveButtonLarge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonLargeDisabled: {
    backgroundColor: Colors.muted,
  },
  saveButtonLargeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  saveButtonLargeTextDisabled: {
    color: Colors.semantic.tabInactive,
  },
});