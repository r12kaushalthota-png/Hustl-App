import { StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constanst from 'expo-constants';
import * as Linking from 'expo-linking';

const merchantIdentifier = Constanst.expoConfig?.plugins?.find(
  (p) => p[0] === '@stripe/stripe-react-native'
)?.[1]?.merchantIdentifier;

if (!merchantIdentifier) {
  throw new Error('No merchant identifier found in app config');
}

const ExpoStripeProvider = (
  props: Omit<
    React.ComponentProps<typeof StripeProvider>,
    'publishableKey' | 'merchantIdentifier'
  >
) => {
  return (
    <StripeProvider
      publishableKey={
        process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'YOUR_STRIPE_KEY'
      }
      merchantIdentifier={merchantIdentifier}
      urlScheme={Linking.createURL('/')?.split(":")[0]}
      {...props}
    />
  );
};
export default ExpoStripeProvider;

const styles = StyleSheet.create({});
