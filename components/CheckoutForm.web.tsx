// CheckoutForm.web.tsx
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap } from 'lucide-react-native'; 
import { Colors } from '@/theme/colors';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CheckoutService } from '@/lib/checkoutService';
import { ReferralService } from '@/lib/referralService';
import { useAuth } from '@/contexts/AuthContext';

const stripePromise = loadStripe(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

async function fetchPaymentSheetParams({ amount }: { amount: number }) {
  const response = await fetch(
    'https://blzvlzlopagunugkacyz.functions.supabase.co/payment-sheet',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ amount }),
    }
  );
  const data = await response.json();
  return data;
}

function CheckoutInner({
  amount,
  isFormValid,
  submitTask,
  category = 'food',
}: {
  amount: number;
  isFormValid: () => boolean;
  submitTask: () => void;
  category?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [orderTotals, setOrderTotals] = useState<any>(null);
  const [rewardToConsume, setRewardToConsume] = useState<string | null>(null);

  // Calculate totals with free delivery applied
  useEffect(() => {
    calculateTotals();
  }, [amount, category, user]);

  const calculateTotals = async () => {
    if (!user) return;

    try {
      const subtotal = amount;
      const baseDeliveryFee = Math.round(amount * 0.15); // 15% delivery fee
      const serviceFee = Math.round(amount * 0.05); // 5% service fee
      const tax = Math.round(amount * 0.08); // 8% tax
      
      const { data: totals, error } = await CheckoutService.calculateOrderTotals(
        user.id,
        category,
        subtotal,
        baseDeliveryFee,
        serviceFee,
        tax,
        0 // tip
      );

      if (totals) {
        setOrderTotals(totals);
        setRewardToConsume(totals.rewardToConsume || null);
      }
    } catch (error) {
      console.error('Error calculating totals:', error);
    }
  };

  const handlePay = async () => {
    if (!stripe || !elements) return;

    try {
      setIsLoading(true);

      const finalAmount = orderTotals?.total || amount;

      // 1) Minta server bikin PaymentIntent dan balikin client_secret
      const { paymentIntent, mode } = await fetchPaymentSheetParams({ amount: finalAmount });
      if (!paymentIntent) {
        throw new Error('Client secret tidak ditemukan dari server.');
      }

      // 2) Konfirmasi pembayaran di web (CardElement)
      const card = elements.getElement(CardElement);
      if (!card) throw new Error('CardElement belum siap.');

      const { error, paymentIntent: pi } = await stripe.confirmCardPayment(paymentIntent, {
        payment_method: {
          card,
          billing_details: {
            name: 'Test User',
            email: 'test@example.com',
            phone: '1234567890',
          },
        },
      });

      if (error) {
        Alert.alert(error.message ?? 'Payment failed');
        return;
      }

      if (pi?.status === 'succeeded') {
        Alert.alert('Success', 'Your order is confirmed!');
        
        // Consume free delivery reward if applied
        if (rewardToConsume) {
          try {
            await ReferralService.consumeFreeDeliveryReward(rewardToConsume);
          } catch (error) {
            console.error('Failed to consume reward:', error);
          }
        }
        
        submitTask();
      } else {
        Alert.alert('Payment status', pi?.status ?? 'unknown');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Unexpected error');
    } finally {
      setIsLoading(false);
    }
  };

  const disabled = !isFormValid() || isLoading || !stripe || !elements;

  // Show delivery fee savings if free delivery is applied
  const renderDeliveryInfo = () => {
    if (!orderTotals) return null;

    if (orderTotals.freeDeliveryApplied) {
      return (
        <View style={styles.deliveryInfo}>
          <Text style={styles.deliveryInfoText}>
            ✅ Free delivery applied! You saved {CheckoutService.formatCurrency(Math.round(amount * 0.15))}
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={{ gap: 12 }}>
      {renderDeliveryInfo()}
      
      {/* Wrapper div agar CardElement (DOM) tampil rapi */}
      <View style={styles.cardElementWrapper}>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                '::placeholder': { color: '#9CA3AF' },
              },
            },
          }}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, disabled && styles.submitButtonDisabled]}
        onPress={handlePay}
        disabled={disabled}
        accessibilityLabel="Post Task"
        accessibilityRole="button"
      >
        {!disabled && !isLoading ? (
          <LinearGradient colors={['#0047FF', '#0021A5']} style={styles.submitButtonGradient}>
            <Zap size={18} />
            <Text style={styles.submitButtonText}>Post Task</Text>
          </LinearGradient>
        ) : (
          <View style={styles.disabledButtonContent}>
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.disabledButtonText}>Post Task</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function CheckoutForm(props: {
  amount: number;
  isFormValid: () => boolean;
  submitTask: () => void;
  category?: string;
}) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutInner {...props} />
    </Elements>
  );
}

const styles = StyleSheet.create({
  deliveryInfo: {
    backgroundColor: '#10B981' + '15',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B981' + '30',
  },
  deliveryInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
  },
  cardElementWrapper: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 56,
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
    minHeight: 56,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledButtonContent: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  disabledButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});
