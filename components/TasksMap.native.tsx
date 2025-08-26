// TasksMap.native.tsx — TEMPORARY PLACEHOLDER (no expo-maps import)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';

export type TaskPin = {
  id: string;
  title: string;
  reward: string;
  store: string;
  urgency: string;
  latitude: number;
  longitude: number;
};

interface TasksMapProps {
  pins?: TaskPin[];
  onPressPin?: (id: string) => void;
  showsUserLocation?: boolean;
  locationPermission?: string;
  onRequestLocation?: () => void;
}

export default function TasksMapPlaceholder(_: TasksMapProps) {
  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.title}>Map temporarily disabled</Text>
        <Text style={styles.subtitle}>
          Preview is running in Expo Go. We've turned off maps to avoid native-module errors.
        </Text>
        <Text style={styles.hint}>
          TODO: Re-enable by restoring expo-maps imports and map JSX.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors?.semantic?.screen ?? '#FFFFFF' },
  placeholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  title: { fontSize: 18, fontWeight: '600', color: Colors?.semantic?.headingText ?? '#111827', marginBottom: 6 },
  subtitle: { textAlign: 'center', color: Colors?.semantic?.tabInactive ?? '#6B7280', marginBottom: 10 },
  hint: { textAlign: 'center', color: Colors?.semantic?.tabInactive ?? '#9CA3AF', fontSize: 12 },
});