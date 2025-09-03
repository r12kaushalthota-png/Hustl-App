import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
     <Stack.Screen name="welcome" />
      <Stack.Screen name="splash" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="university-selection" />
      <Stack.Screen name="confirm-university" />
      <Stack.Screen name="auth" />
    </Stack>
  );
}