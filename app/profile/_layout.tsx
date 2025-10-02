import { Stack, useRouter } from 'expo-router';

export default function ProfileLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        listeners={{
          beforeRemove: (e) => {
            if (e.data.action.type === 'GO_BACK') {
              e.preventDefault();
              router.replace('/(tabs)/home');
            }
          },
        }}
      />
      <Stack.Screen name="edit" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="reviews" />
      <Stack.Screen name="my-tasks" />
      <Stack.Screen name="task-history" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="help" />
    </Stack>
  );
}