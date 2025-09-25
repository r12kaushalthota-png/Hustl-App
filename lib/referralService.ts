import { supabase } from './supabase';

export interface FreeDeliveryReward {
  id: string;
  user_id: string;
  amount: number; // Will be 0 for free delivery rewards
  transaction_type: string; // Will be 'earned'
  reason: string; // Will be 'FREE_DELIVERY_REFERRAL'
  task_id: string | null;
  created_at: string;
  uses_remaining?: number; // Track remaining uses
  metadata?: any; // Store additional info
}

export class ReferralService {
  /**
   * Issue a free delivery reward when someone joins with referral code
   */
  static async issueFreeDeliveryReward(referrerId: string, newUserId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: referrerId,
          amount: 0, // $0 amount since this is a delivery fee waiver
          transaction_type: 'earned',
          reason: 'FREE_DELIVERY_REFERRAL',
          task_id: null,
          created_at: new Date().toISOString(),
          // Store metadata about the reward
          metadata: {
            issued_for: 'referral_join',
            referred_user_id: newUserId,
            uses_remaining: 1,
            scope: 'food_or_delivery_only'
          }
        });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Failed to issue free delivery reward' };
    }
  }

  /**
   * Get user's available free delivery rewards
   */
  static async getFreeDeliveryRewards(userId: string): Promise<{ data: FreeDeliveryReward[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('reason', 'FREE_DELIVERY_REFERRAL')
        .eq('transaction_type', 'earned')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      // Filter for unused rewards (where uses_remaining > 0)
      const availableRewards = (data || []).filter(reward => {
        const usesRemaining = reward.metadata?.uses_remaining || 0;
        return usesRemaining > 0;
      });

      return { data: availableRewards as FreeDeliveryReward[], error: null };
    } catch (error) {
      return { data: null, error: 'Failed to load free delivery rewards' };
    }
  }

  /**
   * Apply free delivery to order if eligible
   */
  static async applyFreeDeliveryIfEligible(
    userId: string, 
    orderCategory: string, 
    deliveryFee: number
  ): Promise<{ 
    updatedDeliveryFee: number; 
    shouldConsume: boolean; 
    rewardId: string | null;
    error: string | null;
  }> {
    try {
      // Only apply to food/delivery orders
      if (orderCategory !== 'food' && orderCategory !== 'coffee') {
        return { 
          updatedDeliveryFee: deliveryFee, 
          shouldConsume: false, 
          rewardId: null, 
          error: null 
        };
      }

      // Don't consume reward if delivery fee is already $0
      if (deliveryFee <= 0) {
        return { 
          updatedDeliveryFee: deliveryFee, 
          shouldConsume: false, 
          rewardId: null, 
          error: null 
        };
      }

      // Get available free delivery rewards
      const { data: rewards, error } = await this.getFreeDeliveryRewards(userId);
      
      if (error) {
        return { 
          updatedDeliveryFee: deliveryFee, 
          shouldConsume: false, 
          rewardId: null, 
          error: error 
        };
      }

      // Check if user has any available rewards
      if (!rewards || rewards.length === 0) {
        return { 
          updatedDeliveryFee: deliveryFee, 
          shouldConsume: false, 
          rewardId: null, 
          error: null 
        };
      }

      // Use the first available reward
      const reward = rewards[0];
      
      return { 
        updatedDeliveryFee: 0, // Waive delivery fee
        shouldConsume: true, 
        rewardId: reward.id, 
        error: null 
      };
    } catch (error) {
      return { 
        updatedDeliveryFee: deliveryFee, 
        shouldConsume: false, 
        rewardId: null, 
        error: 'Failed to apply free delivery' 
      };
    }
  }

  /**
   * Consume free delivery reward after successful order
   */
  static async consumeFreeDeliveryReward(rewardId: string): Promise<{ error: string | null }> {
    try {
      // Get the current reward
      const { data: reward, error: fetchError } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('id', rewardId)
        .single();

      if (fetchError || !reward) {
        return { error: 'Reward not found' };
      }

      // Update uses_remaining to 0
      const updatedMetadata = {
        ...reward.metadata,
        uses_remaining: 0,
        consumed_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('credit_transactions')
        .update({
          metadata: updatedMetadata
        })
        .eq('id', rewardId);

      if (updateError) {
        return { error: updateError.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Failed to consume free delivery reward' };
    }
  }

  /**
   * Count available free deliveries for user
   */
  static async countFreeDeliveries(userId: string): Promise<{ count: number; error: string | null }> {
    try {
      const { data: rewards, error } = await this.getFreeDeliveryRewards(userId);
      
      if (error) {
        return { count: 0, error: error };
      }

      const count = rewards?.length || 0;
      return { count, error: null };
    } catch (error) {
      return { count: 0, error: 'Failed to count free deliveries' };
    }
  }

  /**
   * Format free delivery status text for UI
   */
  static formatFreeDeliveryStatus(count: number): string {
    if (count === 0) {
      return 'Invite a friend—get 1 free delivery when they join.';
    } else if (count === 1) {
      return 'You have 1 free delivery left';
    } else {
      return `You have ${count} free deliveries left`;
    }
  }
}