import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform, ActionSheetIOS, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, User, GraduationCap, Mail, MapPin, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useEditProfileForm } from '@/hooks/useEditProfileForm';
import { MediaUtils } from '@/lib/media';
import MajorSelector from '@/components/MajorSelector';
import YearSelector from '@/components/YearSelector';
import Toast from '@/components/Toast';

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
    checkUnsavedChanges,
    isEmailEditable,
  } = useEditProfileForm();

  // Avatar state
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.profile?.avatar_url || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  // Update avatar when user profile changes
  React.useEffect(() => {
    setAvatarUri(user?.profile?.avatar_url || null);
  }, [user?.profile?.avatar_url]);

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
    if (checkUnsavedChanges()) {
      // Show confirmation dialog for unsaved changes
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: 'You have unsaved changes',
            message: 'What would you like to do?',
            options: ['Discard Changes', 'Keep Editing', 'Save Changes'],
            destructiveButtonIndex: 0,
            cancelButtonIndex: 1,
          },
          async (buttonIndex) => {
            switch (buttonIndex) {
              case 0: // Discard
                handleDiscard();
                router.back();
                break;
              case 1: // Keep editing
                break;
              case 2: // Save
                const result = await handleSave();
                if (result.success) {
                  setToast({
                    visible: true,
                    message: 'Profile updated successfully!',
                    type: 'success'
                  });
                  setTimeout(() => router.back(), 1000);
                } else {
                  setToast({
                    visible: true,
                    message: result.error || 'Failed to save changes',
                    type: 'error'
                  });
                }
                break;
            }
          }
        );
      } else {
        // Android - use Alert
        Alert.alert(
          'Unsaved Changes',
          'You have unsaved changes. What would you like to do?',
          [
            { text: 'Discard', style: 'destructive', onPress: () => { handleDiscard(); router.back(); } },
            { text: 'Keep Editing', style: 'cancel' },
            { 
              text: 'Save', 
              onPress: async () => {
                const result = await handleSave();
                if (result.success) {
                  setToast({
                    visible: true,
                    message: 'Profile updated successfully!',
                    type: 'success'
                  });
                  setTimeout(() => router.back(), 1000);
                } else {
                  setToast({
                    visible: true,
                    message: result.error || 'Failed to save changes',
                    type: 'error'
                  });
                }
              }
            }
          ]
        );
      }
    } else {
      router.back();
    }
  };

  const handleSavePress = async () => {
    triggerHaptics();
    
    const result = await handleSave();
    
    if (result.success) {
      setToast({
        visible: true,
        message: 'Profile updated successfully!',
        type: 'success'
      });
      
      // Navigate back after showing success message
      setTimeout(() => {
        router.back();
      }, 1000);
    } else {
      setToast({
        visible: true,
        message: result.error || 'Failed to save changes',
        type: 'error'
      });
    }
  };

  const handleAvatarPress = () => {
    if (!user || isUploadingAvatar) return;
    
    triggerHaptics();
    
    MediaUtils.showAvatarActionSheet(
      !!avatarUri,
      () => handlePickAvatar('camera'),
      () => handlePickAvatar('library'),
      avatarUri ? handleRemoveAvatar : undefined
    );
  };

  const handlePickAvatar = async (source: 'camera' | 'library') => {
    if (!user || isUploadingAvatar) return;

    try {
      const result = await MediaUtils.pickAvatar(source);
      
      if (!result.success) {
        if (result.error?.includes('permission')) {
          setToast({
            visible: true,
            message: result.error,
            type: 'error'
          });
        }
        return;
      }

      if (!result.uri) return;

      // Set preview immediately
      setAvatarUri(result.uri);
      setIsUploadingAvatar(true);

      // Upload to Supabase
      const uploadResult = await MediaUtils.uploadAvatarAsync(result.uri, user.id);
      
      if (uploadResult.success && uploadResult.url) {
        setAvatarUri(uploadResult.url);
        setToast({
          visible: true,
          message: 'Profile photo updated!',
          type: 'success'
        });
      } else {
        // Revert to previous avatar on upload failure
        setAvatarUri(user.profile?.avatar_url || null);
        setToast({
          visible: true,
          message: uploadResult.error || 'Failed to upload photo',
          type: 'error'
        });
      }
    } catch (error) {
      // Revert to previous avatar on error
      setAvatarUri(user.profile?.avatar_url || null);
      setToast({
        visible: true,
        message: 'Failed to update photo. Please try again.',
        type: 'error'
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || isUploadingAvatar) return;

    setIsUploadingAvatar(true);

    try {
      const result = await MediaUtils.removeAvatarAsync(user.id);
      
      if (result.success) {
        setAvatarUri(null);
        setToast({
          visible: true,
          message: 'Profile photo removed',
          type: 'success'
        });
      } else {
        setToast({
          visible: true,
          message: result.error || 'Failed to remove photo',
          type: 'error'
        });
      }
    } catch (error) {
      setToast({
        visible: true,
        message: 'Failed to remove photo. Please try again.',
        type: 'error'
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity 
            style={[
              styles.saveButton,
              (!isValid || isSaving) && styles.saveButtonDisabled
            ]}
            onPress={handleSavePress}
            disabled={!isValid || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={[
                styles.saveButtonText,
                (!isValid || isSaving) && styles.saveButtonTextDisabled
              ]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Photo Section */}
          <View style={styles.photoSection}>
            <View style={styles.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {user ? MediaUtils.getInitials(user.displayName) : 'U'}
                  </Text>
                </View>
              )}
              
              {/* Upload Progress Overlay */}
              {isUploadingAvatar && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="large" color={Colors.white} />
                </View>
              )}
              
              <TouchableOpacity 
                style={[
                  styles.cameraButton,
                  isUploadingAvatar && styles.cameraButtonDisabled
                ]}
                onPress={handleAvatarPress}
                disabled={isUploadingAvatar}
                accessibilityLabel="Change profile photo"
                accessibilityRole="button"
              >
                <Camera size={16} color={Colors.white} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              onPress={handleAvatarPress}
              disabled={isUploadingAvatar}
            >
              <Text style={[
                styles.changePhotoText,
                isUploadingAvatar && styles.changePhotoTextDisabled
              ]}>
                {isUploadingAvatar ? 'Uploading...' : 'Change Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name *</Text>
              <View style={[
                styles.inputContainer,
                errors.display_name && styles.inputContainerError
              ]}>
                <User size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  value={formData.display_name}
                  onChangeText={(value) => updateField('display_name', value)}
                  onBlur={() => validateField('display_name')}
                  placeholder="Enter your display name"
                  placeholderTextColor={Colors.semantic.tabInactive}
                  editable={!isSaving}
                  maxLength={30}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>
              {errors.display_name && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={14} color={Colors.semantic.errorAlert} strokeWidth={2} />
                  <Text style={styles.errorText}>{errors.display_name}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email {!isEmailEditable && '(from account)'}
              </Text>
              <View style={[
                styles.inputContainer,
                !isEmailEditable && styles.inputContainerDisabled,
                errors.email && styles.inputContainerError
              ]}>
                <Mail size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <TextInput
                  style={[
                    styles.input,
                    !isEmailEditable && styles.inputDisabled
                  ]}
                  value={formData.email}
                  onChangeText={(value) => updateField('email', value)}
                  onBlur={() => validateField('email')}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.semantic.tabInactive}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={isEmailEditable && !isSaving}
                />
              </View>
              {!isEmailEditable && (
                <Text style={styles.helperText}>
                  This email is linked to your account and cannot be changed here
                </Text>
              )}
              {errors.email && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={14} color={Colors.semantic.errorAlert} strokeWidth={2} />
                  <Text style={styles.errorText}>{errors.email}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Major *</Text>
              <MajorSelector
                value={formData.major}
                onSelect={(major) => {
                  updateField('major', major);
                  validateField('major');
                }}
                error={errors.major}
                disabled={isSaving}
              />
              {errors.major && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={14} color={Colors.semantic.errorAlert} strokeWidth={2} />
                  <Text style={styles.errorText}>{errors.major}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Year *</Text>
              <YearSelector
                value={formData.year}
                onSelect={(year) => {
                  updateField('year', year);
                  validateField('year');
                }}
                error={errors.year}
                disabled={isSaving}
              />
              {errors.year && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={14} color={Colors.semantic.errorAlert} strokeWidth={2} />
                  <Text style={styles.errorText}>{errors.year}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>University</Text>
              <View style={[styles.inputContainer, styles.inputContainerDisabled]}>
                <MapPin size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={user?.university || 'University of Florida'}
                  placeholder="University"
                  placeholderTextColor={Colors.semantic.tabInactive}
                  editable={false}
                />
              </View>
              <Text style={styles.helperText}>
                University cannot be changed after account creation
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>

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
  saveButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  saveButtonTextDisabled: {
    color: Colors.white + '80',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
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
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.white,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cameraButtonDisabled: {
    backgroundColor: Colors.semantic.tabInactive,
    opacity: 0.6,
  },
  changePhotoText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  changePhotoTextDisabled: {
    color: Colors.semantic.tabInactive,
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
    minHeight: 56,
  },
  inputContainerError: {
    borderColor: Colors.semantic.errorAlert,
  },
  inputContainerDisabled: {
    backgroundColor: Colors.muted,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.inputText,
  },
  inputDisabled: {
    color: Colors.semantic.tabInactive,
  },
  helperText: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  errorText: {
    fontSize: 14,
    color: Colors.semantic.errorAlert,
    flex: 1,
  },
});