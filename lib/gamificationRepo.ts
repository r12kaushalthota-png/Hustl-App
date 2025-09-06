import { supabase } from './supabase';

export interface XPTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  task_id: string | null;
  review_id: string | null;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'earned' | 'spent' | 'purchased';
  reason: string;
  task_id: string | null;
  created_at: string;
}

export class GamificationRepo {
  /**
   * Format credits for display
   */
  static formatCredits(credits: number): string {
    if (credits === 0) return '0 credits';
    if (credits === 1) return '1 credit';
    return `${credits.toLocaleString()} credits`;
  }

  /**
   * Format XP for display
   */
  static formatXP(xp: number): string {
    if (xp === 0) return '0 XP';
    return `${xp.toLocaleString()} XP`;
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
   * Get user's XP transactions
   */
  static async getUserXPTransactions(userId: string, limit: number = 20): Promise<{ data: XPTransaction[] | null; error: string | null }> {
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
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Get user's credit transactions
   */
  static async getUserCreditTransactions(userId: string, limit: number = 20): Promise<{ data: CreditTransaction[] | null; error: string | null }> {
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
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Award XP to user (typically called by database triggers)
   */
  static async awardXP(userId: string, amount: number, reason: string, taskId?: string, reviewId?: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('xp_transactions')
        .insert({
          user_id: userId,
          amount,
          reason,
          task_id: taskId || null,
          review_id: reviewId || null,
        });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Award credits to user
   */
  static async awardCredits(userId: string, amount: number, reason: string, taskId?: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount,
          transaction_type: 'earned',
          reason,
          task_id: taskId || null,
        });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Spend credits
   */
  static async spendCredits(userId: string, amount: number, reason: string, taskId?: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: -amount, // Negative for spending
          transaction_type: 'spent',
          reason,
          task_id: taskId || null,
        });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Get user's current stats (XP, level, credits)
   */
  static async getUserStats(userId: string): Promise<{ data: { xp: number; level: number; credits: number } | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('xp, level, credits')
        .eq('id', userId)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { 
        data: {
          xp: data.xp || 0,
          level: data.level || 1,
          credits: data.credits || 0,
        }, 
        error: null 
      };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }
}