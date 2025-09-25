import {
  ActivityIndicator,
  Alert,
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '@/theme/colors';
import React, { useState } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap } from 'lucide-react-native';
import { CheckoutService } from '@/lib/checkoutService';
import { useAuth } from '@/contexts/AuthContext';

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

const CheckoutForm = ({
  amount,
  isFormValid,
  submitTask,
  category = 'food',
}: {
  amount: number;
  isFormValid: () => boolean;
  submitTask: () => void;
  category?: string;
}) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
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

  const initializePaymentSheet = async () => {
    const finalAmount = orderTotals?.total || amount;
    console.log('Initializing payment sheet with amount:', finalAmount);
    const { paymentIntent, ephemeralKey, customer, mode } =
      await fetchPaymentSheetParams({ amount: finalAmount });
    console.log('Payment sheet params:', {
      paymentIntent,
      ephemeralKey,
      customer,
      mode,
    });

    const data = await initPaymentSheet({
      merchantDisplayName: 'Hustl',
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: paymentIntent,
      allowsDelayedPaymentMethods: true,
      defaultBillingDetails: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
      },
      applePay: {
        merchantCountryCode: 'US',
      },
    });

    if (data.error) {
      console.error('Error initializing payment sheet:', data.error);
      Alert.alert(`Error: ${data.error.message}`);
    } else {
      setIsLoading(false);
      console.log('Payment sheet initialized');
    }
  };

  const openPaymentSheet = async () => {
    const { error } = await presentPaymentSheet();
    if (error) {
      Alert.alert(`${error.message}`);
    } else {
      Alert.alert('Success', 'Your oder is confirmed!');
      
      // Consume free delivery reward if applied
      if (rewardToConsume) {
        try {
          await ReferralService.consumeFreeDeliveryReward(rewardToConsume);
        } catch (error) {
          console.error('Failed to consume reward:', error);
        }
      }
      
      submitTask();
    }
  };

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
    <View>
      {renderDeliveryInfo()}
      <TouchableOpacity
        style={[
          styles.submitButton,
          (!isFormValid() || isLoading) && styles.submitButtonDisabled,
        ]}
        onPress={async () => {
          setIsLoading(true);
          await initializePaymentSheet();
          await openPaymentSheet();
          setIsLoading(false);
        }}
        disabled={!isFormValid() || isLoading}
        accessibilityLabel="Post Task"
        accessibilityRole="button"
      >
        {isFormValid() && !isLoading ? (
          <LinearGradient
            colors={['#0047FF', '#0021A5']}
            style={styles.submitButtonGradient}
          >
            <Zap
              size={18}
              color={Colors.white}
              strokeWidth={2.5}
              fill={Colors.white}
            />
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
};

export default CheckoutForm;

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
