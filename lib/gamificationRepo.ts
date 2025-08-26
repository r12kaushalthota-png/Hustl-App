import { supabase } from './supabase';
import type { XPTransaction, CreditTransaction } from '@/types/database';

export class GamificationRepo {
  /**
   * Get user's XP transactions
   */
  static async getUserXPTransactions(
    userId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<{ data: XPTransaction[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

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
  static async getUserCreditTransactions(
    userId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<{ data: CreditTransaction[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Award XP to user
   */
  static async awardXP(
    userId: string,
    amount: number,
    reason: string,
    taskId?: string,
    reviewId?: string
  ): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('award_xp', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason,
        p_task_id: taskId || null,
        p_review_id: reviewId || null
      });

      if (error) {
        return { data: null, error: error.message };
      }

      if (data?.error) {
        return { data: null, error: data.error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Award credits to user
   */
  static async awardCredits(
    userId: string,
    amount: number,
    reason: string,
    taskId?: string
  ): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('award_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason,
        p_task_id: taskId || null
      });

      if (error) {
        return { data: null, error: error.message };
      }

      if (data?.error) {
        return { data: null, error: data.error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Spend credits
   */
  static async spendCredits(
    userId: string,
    amount: number,
    reason: string,
    taskId?: string
  ): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('spend_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason,
        p_task_id: taskId || null
      });

      if (error) {
        return { data: null, error: error.message };
      }

      if (data?.error) {
        return { data: null, error: data.error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Get level requirements
   */
  static getLevelRequirements(): { level: number; xpRequired: number; xpForNext: number }[] {
    const thresholds = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000];
    
    return thresholds.map((xp, index) => ({
      level: index + 1,
      xpRequired: xp,
      xpForNext: thresholds[index + 1] || 20000 // Max level cap
    }));
  }

  /**
   * Calculate XP progress for current level
   */
  static calculateXPProgress(currentXP: number, currentLevel: number): {
    currentLevelXP: number;
    nextLevelXP: number;
    progress: number;
    xpToNext: number;
  } {
    const requirements = this.getLevelRequirements();
    const currentLevelReq = requirements[currentLevel - 1];
    const nextLevelReq = requirements[currentLevel];

    if (!nextLevelReq) {
      // Max level reached
      return {
        currentLevelXP: currentLevelReq.xpRequired,
        nextLevelXP: currentLevelReq.xpRequired,
        progress: 1,
        xpToNext: 0
      };
    }

    const currentLevelXP = currentLevelReq.xpRequired;
    const nextLevelXP = nextLevelReq.xpRequired;
    const xpInCurrentLevel = currentXP - currentLevelXP;
    const xpNeededForLevel = nextLevelXP - currentLevelXP;
    const progress = Math.min(1, xpInCurrentLevel / xpNeededForLevel);
    const xpToNext = Math.max(0, nextLevelXP - currentXP);

    return {
      currentLevelXP,
      nextLevelXP,
      progress,
      xpToNext
    };
  }

  /**
   * Get leaderboard data
   */
  static async getLeaderboard(
    type: 'xp' | 'level' | 'tasks_completed' = 'xp',
    limit: number = 50
  ): Promise<{ data: any[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, xp, level, major')
        .limit(limit);

      switch (type) {
        case 'xp':
          query = query.order('xp', { ascending: false });
          break;
        case 'level':
          query = query.order('level', { ascending: false }).order('xp', { ascending: false });
          break;
        case 'tasks_completed':
          // This would require a more complex query with task counts
          query = query.order('xp', { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Format XP amount for display
   */
  static formatXP(xp: number): string {
    if (xp >= 1000000) {
      return `${(xp / 1000000).toFixed(1)}M XP`;
    } else if (xp >= 1000) {
      return `${(xp / 1000).toFixed(1)}K XP`;
    }
    return `${xp} XP`;
  }

  /**
   * Format credits for display
   */
  static formatCredits(credits: number): string {
    return `${credits.toLocaleString()} credits`;
  }

  /**
   * Get level badge color
   */
  static getLevelBadgeColor(level: number): string {
    if (level >= 10) return '#FFD700'; // Gold
    if (level >= 7) return '#C0C0C0'; // Silver
    if (level >= 4) return '#CD7F32'; // Bronze
    return '#3B82F6'; // Blue for beginners
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