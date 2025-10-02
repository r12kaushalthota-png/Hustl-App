import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

export default function ProfileTab() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile');
  }, []);

  return <View />;
}
