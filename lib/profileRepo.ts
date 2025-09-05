import { supabase } from './supabase';
import type { UserProfile } from '@/types/database';

export class ProfileRepo {
  /**
   * Get user profile by ID
   */
  static async getProfile(userId: string): Promise<{ data: UserProfile | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .limit(1);

      if (error) {
        return { data: null, error: error.message };
      }

      const profile = data?.[0] ?? null;
      return { data: profile, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ data: UserProfile | null; error: string | null }> {
    try {
      // Prepare the update data with proper field mapping
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Map form fields to database fields
      if (updates.full_name !== undefined) updateData.full_name = updates.full_name;
      if (updates.username !== undefined) updateData.username = updates.username;
      if (updates.avatar_url !== undefined) updateData.avatar_url = updates.avatar_url;
      if (updates.major !== undefined) updateData.major = updates.major;
      if (updates.university !== undefined) updateData.university = updates.university;
      if (updates.bio !== undefined) updateData.bio = updates.bio;
      if (updates.class_year !== undefined) updateData.class_year = updates.class_year;
      if (updates.xp !== undefined) updateData.xp = updates.xp;
      if (updates.level !== undefined) updateData.level = updates.level;
      if (updates.credits !== undefined) updateData.credits = updates.credits;
      if (updates.is_verified !== undefined) updateData.is_verified = updates.is_verified;
      if (updates.completed_tasks_count !== undefined) updateData.completed_tasks_count = updates.completed_tasks_count;
      if (updates.response_rate !== undefined) updateData.response_rate = updates.response_rate;
      if (updates.last_seen_at !== undefined) updateData.last_seen_at = updates.last_seen_at;

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .limit(1);

      if (error) {
        return { data: null, error: error.message };
      }

      const profile = data?.[0] ?? null;
      return { data: profile, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Create or update profile (upsert)
   */
  static async upsertProfile(profile: Partial<UserProfile> & { id: string }): Promise<{ data: UserProfile | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          ...profile,
          updated_at: new Date().toISOString()
        })
        .select()
        .limit(1);

      if (error) {
        return { data: null, error: error.message };
      }

      const upsertedProfile = data?.[0] ?? null;
      return { data: upsertedProfile, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Search profiles by name or username
   */
  static async searchProfiles(query: string, limit: number = 20): Promise<{ data: UserProfile[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(limit);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }
}