import { supabase } from './supabase';
import type { UserProfile } from '@/types/database';

export class GamificationRepo {
  /**
   * Format credits for display
   */
  static formatCredits(credits: number): string {
    if (credits === 0) return '0 credits';
    if (credits === 1) return '1 credit';
    return `${credits} credits`;
  }

  /**
   * Award XP to user
   */
  static async awardXP(userId: string, amount: number, reason: string, taskId?: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.rpc('award_xp', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason,
        p_task_id: taskId
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Failed to award XP' };
    }
  }

  /**
   * Award credits to user
   */
  static async awardCredits(userId: string, amount: number, reason: string, taskId?: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.rpc('award_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason,
        p_task_id: taskId
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Failed to award credits' };
    }
  }

  /**
   * Get user's XP transactions
   */
  static async getXPTransactions(userId: string, limit: number = 20): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Failed to load XP transactions' };
    }
  }

  /**
   * Get user's credit transactions
   */
  static async getCreditTransactions(userId: string, limit: number = 20): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Failed to load credit transactions' };
    }
  }

  /**
   * Calculate level from XP
   */
  static calculateLevel(xp: number): number {
    // Simple level calculation: 100 XP per level
    return Math.floor(xp / 100) + 1;
  }

  /**
   * Calculate XP needed for next level
   */
  static getXPForNextLevel(currentXP: number): number {
    const currentLevel = this.calculateLevel(currentXP);
    const nextLevelXP = currentLevel * 100;
    return nextLevelXP - currentXP;
  }

  /**
   * Format XP for display
   */
  static formatXP(xp: number): string {
    if (xp === 0) return '0 XP';
    if (xp === 1) return '1 XP';
    return `${xp} XP`;
  }

  /**
   * Get user's current level and progress
   */
  static getUserLevelInfo(profile: UserProfile): {
    level: number;
    currentXP: number;
    xpForNextLevel: number;
    progressPercent: number;
  } {
    const currentXP = profile.xp || 0;
    const level = this.calculateLevel(currentXP);
    const xpForNextLevel = this.getXPForNextLevel(currentXP);
    const xpInCurrentLevel = currentXP - ((level - 1) * 100);
    const progressPercent = (xpInCurrentLevel / 100) * 100;

    return {
      level,
      currentXP,
      xpForNextLevel,
      progressPercent: Math.min(100, Math.max(0, progressPercent))
    };
  }
}