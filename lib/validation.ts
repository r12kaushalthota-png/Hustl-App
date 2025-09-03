export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface ProfileFormData {
  display_name: string;
  email: string;
  major: string;
  year: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate';
}

// Allowed majors list
export const ALLOWED_MAJORS = [
  'Computer Science',
  'Information Systems',
  'Computer Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Aerospace Engineering',
  'Chemical Engineering',
  'Industrial Engineering',
  'Business Administration',
  'Finance',
  'Marketing',
  'Accounting',
  'Economics',
  'Biology',
  'Chemistry',
  'Physics',
  'Mathematics',
  'Statistics',
  'Psychology',
  'Political Science',
  'English',
  'History',
  'Philosophy',
  'Art',
  'Music',
  'Theatre',
  'Journalism',
  'Communications',
  'Education',
  'Nursing',
  'Medicine',
  'Pharmacy',
  'Dentistry',
  'Veterinary Medicine',
  'Law',
  'Architecture',
  'Landscape Architecture',
  'Urban Planning',
  'Agriculture',
  'Environmental Science',
  'Forestry',
  'Other'
];

export const YEAR_OPTIONS: ProfileFormData['year'][] = [
  'Freshman',
  'Sophomore', 
  'Junior',
  'Senior',
  'Graduate'
];

export class ProfileValidator {
  /**
   * Validate display name
   */
  static validateDisplayName(value: string): string {
    const trimmed = value.trim();
    
    if (!trimmed) {
      return 'Display name is required';
    }
    
    if (trimmed.length < 2) {
      return 'Display name must be at least 2 characters';
    }
    
    if (trimmed.length > 30) {
      return 'Display name must be 30 characters or less';
    }
    
    // Allow letters, numbers, spaces, underscore, period, hyphen
    const validPattern = /^[a-zA-Z0-9\s._-]+$/;
    if (!validPattern.test(trimmed)) {
      return 'Display name can only contain letters, numbers, spaces, and ._- characters';
    }
    
    return '';
  }

  /**
   * Validate email format
   */
  static validateEmail(value: string): string {
    const trimmed = value.trim();
    
    if (!trimmed) {
      return 'Email is required';
    }
    
    // Basic RFC-ish email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmed)) {
      return 'Please enter a valid email address';
    }
    
    return '';
  }

  /**
   * Validate major selection
   */
  static validateMajor(value: string): string {
    if (!value) {
      return 'Please select your major';
    }
    
    if (!ALLOWED_MAJORS.includes(value)) {
      return 'Please select a major from the list';
    }
    
    return '';
  }

  /**
   * Validate year selection
   */
  static validateYear(value: string): string {
    if (!value) {
      return 'Please select your year';
    }
    
    if (!YEAR_OPTIONS.includes(value as ProfileFormData['year'])) {
      return 'Please select a valid year';
    }
    
    return '';
  }

  /**
   * Validate entire form
   */
  static validateForm(data: ProfileFormData, isEmailEditable: boolean = true): ValidationResult {
    const errors: Record<string, string> = {};
    
    errors.display_name = this.validateDisplayName(data.display_name);
    
    if (isEmailEditable) {
      errors.email = this.validateEmail(data.email);
    }
    
    errors.major = this.validateMajor(data.major);
    errors.year = this.validateYear(data.year);
    
    // Remove empty errors
    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key];
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Clean and normalize form data
   */
  static cleanFormData(data: ProfileFormData): ProfileFormData {
    return {
      display_name: data.display_name.trim().replace(/\s+/g, ' '), // Collapse multiple spaces
      email: data.email.trim().toLowerCase(),
      major: data.major.trim(),
      year: data.year
    };
  }
}