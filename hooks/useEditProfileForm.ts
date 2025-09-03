import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { ProfileValidator, ProfileFormData, ValidationResult } from '@/lib/validation';
import { ProfileRepo } from '@/lib/profileRepo';
import { useAuth } from '@/contexts/AuthContext';

interface UseEditProfileFormReturn {
  // Form data
  formData: ProfileFormData;
  originalData: ProfileFormData;
  
  // Validation
  errors: Record<string, string>;
  isValid: boolean;
  isDirty: boolean;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Actions
  updateField: (field: keyof ProfileFormData, value: string) => void;
  validateField: (field: keyof ProfileFormData) => void;
  handleSave: () => Promise<{ success: boolean; error?: string }>;
  handleDiscard: () => void;
  checkUnsavedChanges: () => boolean;
  
  // Computed
  isEmailEditable: boolean;
}

export function useEditProfileForm(): UseEditProfileFormReturn {
  const { user, session } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState<ProfileFormData>({
    display_name: '',
    email: '',
    major: '',
    year: 'Freshman'
  });
  
  const [originalData, setOriginalData] = useState<ProfileFormData>({
    display_name: '',
    email: '',
    major: '',
    year: 'Freshman'
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load initial data
  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { data: profile, error } = await ProfileRepo.getProfile(user.id);
      
      if (error) {
        console.error('Failed to load profile:', error);
        return;
      }
      
      const initialData: ProfileFormData = {
        display_name: profile?.full_name || user.displayName || '',
        email: user.email || '',
        major: profile?.major || '',
        year: (profile?.year as ProfileFormData['year']) || 'Freshman'
      };
      
      setFormData(initialData);
      setOriginalData(initialData);
      setErrors({});
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if email is editable (not the auth email)
  const isEmailEditable = !session?.user?.email || formData.email !== session.user.email;

  // Update form field
  const updateField = useCallback((field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  // Validate single field
  const validateField = useCallback((field: keyof ProfileFormData) => {
    let error = '';
    
    switch (field) {
      case 'display_name':
        error = ProfileValidator.validateDisplayName(formData.display_name);
        break;
      case 'email':
        if (isEmailEditable) {
          error = ProfileValidator.validateEmail(formData.email);
        }
        break;
      case 'major':
        error = ProfileValidator.validateMajor(formData.major);
        break;
      case 'year':
        error = ProfileValidator.validateYear(formData.year);
        break;
    }
    
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  }, [formData, isEmailEditable]);

  // Check if form is dirty
  const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData);

  // Validate entire form
  const validation = ProfileValidator.validateForm(formData, isEmailEditable);
  const isValid = validation.isValid && isDirty;

  // Save form
  const handleSave = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || isSaving) {
      return { success: false, error: 'Unable to save at this time' };
    }

    // Final validation
    const finalValidation = ProfileValidator.validateForm(formData, isEmailEditable);
    
    if (!finalValidation.isValid) {
      setErrors(finalValidation.errors);
      return { success: false, error: 'Please fix the errors above' };
    }

    setIsSaving(true);
    
    try {
      // Clean form data
      const cleanData = ProfileValidator.cleanFormData(formData);
      
      // Update profile
      const { data, error } = await ProfileRepo.updateProfile(user.id, {
        full_name: cleanData.display_name,
        major: cleanData.major,
        year: cleanData.year,
        // Only update email if it's editable
        ...(isEmailEditable && { email: cleanData.email })
      });
      
      if (error) {
        return { success: false, error: error };
      }
      
      // Update original data to reflect saved state
      setOriginalData(cleanData);
      setErrors({});
      
      return { success: true };
      
    } catch (error) {
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    } finally {
      setIsSaving(false);
    }
  }, [user, formData, isEmailEditable, isSaving]);

  // Discard changes
  const handleDiscard = useCallback(() => {
    setFormData(originalData);
    setErrors({});
  }, [originalData]);

  // Check for unsaved changes
  const checkUnsavedChanges = useCallback((): boolean => {
    return isDirty;
  }, [isDirty]);

  return {
    formData,
    originalData,
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
  };
}