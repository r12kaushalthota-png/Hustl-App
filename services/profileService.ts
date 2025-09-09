import type { UserProfile } from '@/types/chat';

export class ProfileService {
  /**
   * Get user initials from name
   */
  static getInitials(name: string | null | undefined): string {
    if (!name || !name.trim()) return 'U';
    
    return name
      .trim()
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Get display name from profile
   */
  static getDisplayName(profile: Pick<UserProfile, 'full_name' | 'username'>): string {
    return profile.full_name || profile.username || 'User';
  }

  /**
   * Get user profile by ID
   */
  static async getProfile(userId: string): Promise<{ data: UserProfile | null; error: string | null }> {
    try {
      const { supabase } = await import('@/lib/supabase');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as UserProfile, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Format user's academic year
   */
  static formatAcademicYear(year: string | null): string {
    if (!year) return '';
    return year;
  }

  /**
   * Format user's university
   */
  static formatUniversity(university: string | null): string {
    return university || 'University of Florida';
  }

  /**
   * Check if user is verified
   */
  static isVerified(profile: UserProfile): boolean {
    return profile.is_verified || false;
  }
}