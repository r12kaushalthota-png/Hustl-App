import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileRepo } from '@/lib/profileRepo';

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
  const { user } = useAuth();
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
  const [profile, setProfile] = useState<any>(null);

  // Load initial data
  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: profileData, error } = await ProfileRepo.getProfile(user.id);
      
      if (error) {
        console.error('Error loading profile:', error);
        // Continue with empty profile if error
        setProfile(null);
        setFormData({
          display_name: user.displayName || '',
          email: user.email || '',
          major: '',
          year: '',
          bio: '',
        });
        setIsLoading(false);
        return;
      }

      setProfile(profileData);
      
      if (profileData) {
        setFormData({
          display_name: profileData.full_name || '',
          email: user.email || '',
          major: profileData.major || '',
          year: profileData.class_year || '',
          bio: profileData.bio || '',
        });
      } else {
        // No profile exists yet, use user data
        setFormData({
          display_name: user.displayName || '',
          email: user.email || '',
          major: '',
          year: '',
          bio: '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Fallback to user data
      setFormData({
        display_name: user.displayName || '',
        email: user.email || '',
        major: '',
        year: '',
        bio: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFormData = () => {
    if (profile && user) {
      setFormData({
        display_name: profile.full_name || '',
        email: user.email || '',
        major: profile.major || '',
        year: profile.class_year || '',
        bio: profile.bio || '',
      });
    }
  };

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
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return { success: false, error: 'Please fix the errors above' };
    }

    setIsSaving(true);
    
    try {
      // Use upsert to create profile if it doesn't exist
      const { data: updatedProfile, error } = await ProfileRepo.upsertProfile({
        id: user.id,
        full_name: formData.display_name.trim(),
        major: formData.major,
        class_year: formData.year,
        bio: formData.bio.trim(),
        university: 'University of Florida',
      });

      if (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: 'Failed to update profile' };
      }

      // Update local profile state
      setProfile(updatedProfile);
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
    refreshFormData();
    setErrors({});
    setIsDirty(false);
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