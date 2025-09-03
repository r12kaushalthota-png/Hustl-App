import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types/database';

interface ProfileCache {
  [userId: string]: {
    data: UserProfile;
    timestamp: number;
  };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const profileCache: ProfileCache = {};

export class ProfileService {
  /**
   * Get user profile with caching
   */
  static async getProfile(userId: string, useCache = true): Promise<{ data: UserProfile | null; error: string | null }> {
    try {
      // Check cache first
      if (useCache && profileCache[userId]) {
        const cached = profileCache[userId];
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
          return { data: cached.data, error: null };
        }
      }

      // Fetch from Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          full_name,
          avatar_url,
          major,
          university,
          bio,
          is_verified,
          completed_tasks_count,
          response_rate,
          xp,
          level,
          credits,
          created_at,
          updated_at
        `)
        .eq('id', userId)
        .limit(1);

      if (error) {
        return { data: null, error: error.message };
      }

      const profile = data?.[0] ?? null;
      
      if (profile) {
        // Cache the result
        profileCache[userId] = {
          data: profile,
          timestamp: Date.now()
        };
      }

      return { data: profile, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Clear profile cache for a specific user
   */
  static clearProfileCache(userId: string): void {
    delete profileCache[userId];
  }

  /**
   * Clear entire profile cache
   */
  static clearAllProfileCache(): void {
    Object.keys(profileCache).forEach(key => delete profileCache[key]);
  }

  /**
   * Get user initials for avatar fallback
   */
  static getInitials(name: string | null): string {
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
   * Format user display name
   */
  static getDisplayName(profile: UserProfile): string {
    return profile.full_name || profile.username || 'User';
  }

  /**
   * Get verification status
   */
  static isVerified(profile: UserProfile): boolean {
    return profile.is_verified || false;
  }

  /**
   * Format rating display
   */
  static formatRating(profile: UserProfile): string | null {
    if (!profile.response_rate || profile.completed_tasks_count === 0) {
      return null;
    }
    
    return `${profile.response_rate.toFixed(1)}% response rate`;
  }

  /**
   * Get level badge color
   */
  static getLevelBadgeColor(level: number): string {
    if (level >= 10) return '#FFD700'; // Gold
    if (level >= 7) return '#C0C0C0'; // Silver
    if (level >= 4) return '#CD7F32'; // Bronze
    return '#3B82F6'; // Blue
  }

  /**
   * Get level title
   */
  static getLevelTitle(level: number): string {
    if (level >= 10) return 'Hustl Legend';
    if (level >= 7) return 'Hustl Expert';
    if (level >= 4) return 'Hustl Pro';
    if (level >= 2) return 'Hustl Helper';
    return 'New Hustler';
  }
}