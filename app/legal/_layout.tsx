import { Stack } from 'expo-router';

export default function LegalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="referral-terms" />
    </Stack>
  );
}