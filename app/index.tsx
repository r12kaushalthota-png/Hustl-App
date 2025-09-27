import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { Linking } from "react-native";
import supabase from '@/lib/supabase';

export default function IndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const handleDeepLink = async (event: any) => {
      const url = event.url;
      console.log("Deep link opened:", url);

      const { data, error } = await supabase.auth.exchangeCodeForSession(url);

      if (error) {
        console.error("Auth error:", error.message);
      } else if (data?.session) {
        console.log("Login success:", data.session.user);
      }
    };
    const sub = Linking.addEventListener("url", handleDeepLink);

    (async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink({ url: initialUrl });
      }
    })();

    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Navigate to splash screen to start onboarding flow
    const timer = setTimeout(() => {
      router.replace('/(onboarding)/splash');
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.text}>Loading Hustl...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.semantic.screen,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
});