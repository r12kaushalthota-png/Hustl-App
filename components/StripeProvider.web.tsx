import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Inisialisasi promise Stripe (harus di luar komponen)
const stripePromise = loadStripe(
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
);

const ExpoStripeProvider = ({
  children,
  ...props
}: React.ComponentProps<typeof Elements>) => {
  // Remove 'stripe' from props to avoid duplicate prop
  const { stripe, ...restProps } = props;
  return (
    <Elements stripe={stripePromise} {...restProps}>
      {children}
    </Elements>
  );
};

export default ExpoStripeProvider;
