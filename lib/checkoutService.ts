import { supabase } from './supabase';
import { ReferralService } from './referralService';

export interface OrderTotals {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  tip: number;
  total: number;
  freeDeliveryApplied: boolean;
  rewardToConsume?: string;
}

export interface OrderData {
  category: string;
  items: any[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  tip: number;
  total: number;
  userId: string;
  idempotencyKey: string;
}

export class CheckoutService {
  /**
   * Calculate order totals with free delivery applied if eligible
   */
  static async calculateOrderTotals(
    userId: string,
    category: string,
    subtotal: number,
    baseDeliveryFee: number,
    serviceFee: number = 0,
    tax: number = 0,
    tip: number = 0
  ): Promise<{ data: OrderTotals | null; error: string | null }> {
    try {
      // Apply free delivery if eligible
      const { 
        updatedDeliveryFee, 
        shouldConsume, 
        rewardId, 
        error: applyError 
      } = await ReferralService.applyFreeDeliveryIfEligible(userId, category, baseDeliveryFee);

      if (applyError) {
        return { data: null, error: applyError };
      }

      const total = subtotal + updatedDeliveryFee + serviceFee + tax + tip;

      const totals: OrderTotals = {
        subtotal,
        deliveryFee: updatedDeliveryFee,
        serviceFee,
        tax,
        tip,
        total,
        freeDeliveryApplied: shouldConsume,
        rewardToConsume: shouldConsume ? rewardId : undefined
      };

      return { data: totals, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to calculate order totals' };
    }
  }

  /**
   * Process order and consume rewards on success
   */
  static async processOrder(orderData: OrderData, rewardToConsume?: string): Promise<{ 
    success: boolean; 
    orderId?: string; 
    error?: string; 
  }> {
    try {
      // Create the order (using existing task creation logic)
      const { data: task, error: createError } = await supabase
        .from('tasks')
        .insert({
          title: `${orderData.category} order`,
          description: 'Food delivery order',
          category: orderData.category,
          store: 'Various',
          dropoff_address: 'User location',
          dropoff_instructions: '',
          urgency: 'medium',
          reward_cents: orderData.total,
          estimated_minutes: 30,
          created_by: orderData.userId,
          status: 'open'
        })
        .select()
        .single();

      if (createError || !task) {
        return { success: false, error: createError?.message || 'Failed to create order' };
      }

      // If order was successful and we have a reward to consume, consume it
      if (rewardToConsume) {
        const { error: consumeError } = await ReferralService.consumeFreeDeliveryReward(rewardToConsume);
        
        if (consumeError) {
          console.error('Failed to consume free delivery reward:', consumeError);
          // Don't fail the order if reward consumption fails
        }
      }

      return { success: true, orderId: task.id };
    } catch (error) {
      return { success: false, error: 'Failed to process order' };
    }
  }

  /**
   * Format currency for display
   */
  static formatCurrency(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }
}