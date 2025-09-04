import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

export interface TaskPin {
  id: string;
  title: string;
  reward: string;
  store: string;
  urgency: string;
  latitude: number;
  longitude: number;
}

interface TasksMapProps {
  pins?: TaskPin[];
  onPressPin?: (id: string) => void;
  showsUserLocation?: boolean;
  locationPermission?: string;
  onRequestLocation?: () => void;
}

export default function TasksMap({ 
  pins = [], 
  onPressPin,
  showsUserLocation,
  locationPermission,
  onRequestLocation
}: TasksMapProps) {
  return (
    <React.Fragment>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MapPin size={48} color={Colors.semantic.tabInactive} strokeWidth={1.5} />
          </View>
          
          <Text style={styles.title}>Map View</Text>
          <Text style={styles.subtitle}>
            Interactive maps are available on mobile devices. Switch to List view to browse all available tasks.
          </Text>
          
          {pins.length > 0 && (
            <Text style={styles.taskCount}>
              {pins.length} task{pins.length !== 1 ? 's' : ''} available
            </Text>
          )}
        </View>
      </View>
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.muted,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  taskCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
});