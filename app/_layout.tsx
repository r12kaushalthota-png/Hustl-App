import 'react-native-get-random-values';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { SupabaseProvider } from '@/contexts/SupabaseContext';
import { GlobalProfileProvider, useGlobalProfile } from '@/contexts/GlobalProfileContext';
import GlobalProfilePanel from '@/components/GlobalProfilePanel';
import { useRouter } from 'expo-router';

function AppContent() {
  const router = useRouter();
  const { isProfilePanelVisible, hideProfilePanel } = useGlobalProfile();

  const handleNavigate = (route: string) => {
    router.push(route as any);
  };

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
      
      <GlobalProfilePanel
        visible={isProfilePanelVisible}
        onClose={hideProfilePanel}
        onNavigate={handleNavigate}
      />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    const router = require('expo-router').router;
    
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
  }, []);

  return (
    <SupabaseProvider>
      <AuthProvider>
        <GlobalProfileProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <AppContent />
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </GlobalProfileProvider>
      </AuthProvider>
    </SupabaseProvider>
  );
}