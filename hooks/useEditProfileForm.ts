import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface FormData {
  display_name: string;
  email: string;
  major: string;
  year: string;
  bio: string;
}

interface FormErrors {
  display_name?: string;
  email?: string;
  major?: string;
  year?: string;
  bio?: string;
}

interface SaveResult {
  success: boolean;
  error?: string;
}

export function useEditProfileForm() {
  const { user, profile, refreshProfile } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    display_name: '',
    email: '',
    major: '',
    year: '',
    bio: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Load initial data
  useEffect(() => {
    if (profile && user) {
      setFormData({
        display_name: profile.full_name || '',
        email: user.email || '',
        major: profile.major || '',
        year: profile.class_year || '',
        bio: profile.bio || '',
      });
      setIsLoading(false);
    }
  }, [profile, user]);

  const validateField = (field: keyof FormData): string | undefined => {
    const value = formData[field];
    
    switch (field) {
      case 'display_name':
        if (!value.trim()) return 'Display name is required';
        if (value.trim().length < 2) return 'Display name must be at least 2 characters';
        if (value.trim().length > 50) return 'Display name must be less than 50 characters';
        break;
      
      case 'email':
        if (!value.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        break;
      
      case 'major':
        if (!value.trim()) return 'Major is required';
        break;
      
      case 'year':
        if (!value.trim()) return 'Academic year is required';
        break;
      
      case 'bio':
        if (value.length > 500) return 'Bio must be less than 500 characters';
        break;
    }
    
    return undefined;
  };

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};
    
    (Object.keys(formData) as Array<keyof FormData>).forEach(field => {
      const error = validateField(field);
      if (error) {
        newErrors[field] = error;
      }
    });
    
    return newErrors;
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateFieldAndSetError = (field: keyof FormData) => {
    const error = validateField(field);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const isValid = Object.keys(validateForm()).length === 0;

  const handleSave = async (): Promise<SaveResult> => {
    if (!user || !profile) {
      return { success: false, error: 'User not authenticated' };
    }

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return { success: false, error: 'Please fix the errors above' };
    }

    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.display_name.trim(),
          major: formData.major,
          class_year: formData.year,
          bio: formData.bio.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: 'Failed to update profile' };
      }

      // Refresh the profile data
      await refreshProfile();
      setIsDirty(false);
      
      return { success: true };
    } catch (error) {
      console.error('Error saving profile:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (profile && user) {
      setFormData({
        display_name: profile.full_name || '',
        email: user.email || '',
        major: profile.major || '',
        year: profile.class_year || '',
        bio: profile.bio || '',
      });
      setErrors({});
      setIsDirty(false);
    }
  };

  // Email is not editable as it's tied to the auth system
  const isEmailEditable = false;

  return {
    formData,
    errors,
    isValid,
    isDirty,
    isLoading,
    isSaving,
    updateField,
    validateField: validateFieldAndSetError,
    handleSave,
    handleDiscard,
    isEmailEditable,
  };
}