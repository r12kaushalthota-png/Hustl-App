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
}: {
  amount: number;
  isFormValid: () => boolean;
  submitTask: () => void;
}) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isLoading, setIsLoading] = useState(false);

  const initializePaymentSheet = async () => {
    console.log('Initializing payment sheet with amount:', amount);
    const { paymentIntent, ephemeralKey, customer, mode } =
      await fetchPaymentSheetParams({ amount });
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
      submitTask();
    }
  };
  return (
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
  );
};

export default CheckoutForm;

const styles = StyleSheet.create({
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
