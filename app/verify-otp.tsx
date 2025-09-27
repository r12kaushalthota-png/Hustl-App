import { useRouter, useRootNavigation } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export default function VerifyAppRedirect() {
  const router = useRouter();
  const rootNavigation = useRootNavigation();

  useEffect(() => {
    if (!rootNavigation) return;

    const unsubscribe = rootNavigation.addListener('state', () => {
      router.replace('/(onboarding)/auth?isverify=true');
    });

    return unsubscribe;
  }, [rootNavigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
