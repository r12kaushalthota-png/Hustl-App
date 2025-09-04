import 'react-native-get-random-values';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { SupabaseProvider } from '@/contexts/SupabaseContext';
import { FoodOrderProvider } from '@/contexts/FoodOrderContext';
import { useRouter } from 'expo-router';

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();

  useEffect(() => {
    // Set up global navigation handler for deep links
    (global as any).navigateToTask = (taskId: string) => {
      router.push(`/task/${taskId}`);
    };

    // Set up global toast handler for foreground notifications
    (global as any).showNotificationToast = (message: string) => {
      // You can implement a global toast here or use your existing toast system
      console.log('Notification toast:', message);
    };

    return () => {
      delete (global as any).navigateToTask;
      delete (global as any).showNotificationToast;
    };
  }, [router]);

  return (
    <SupabaseProvider>
      <AuthProvider>
        <FoodOrderProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </GestureHandlerRootView>
        </FoodOrderProvider>
      </AuthProvider>
    </SupabaseProvider>
  );
}