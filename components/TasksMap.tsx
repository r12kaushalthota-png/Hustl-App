import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { MapPin, Navigation, Smartphone, ExternalLink, Wifi, WifiOff } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

// TODO: Re-enable expo-maps imports when ready for Dev Client
// import * as Location from 'expo-location';
// const expoMaps = require('expo-maps');
// const { MapView, Marker, Circle } = expoMaps;

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
  locationPermission?: string | null;
  onRequestLocation?: () => void;
}

// TODO: Re-enable when maps are restored
// const UF_CAMPUS = {
//   latitude: 29.6436,
//   longitude: -82.3549
// };

// Temporary placeholder component
const MapPlaceholder = ({ pins = [], onRequestDevClient }: { pins: TaskPin[]; onRequestDevClient?: () => void }) => (
  <View style={styles.fallbackContainer}>
    <View style={styles.fallbackContent}>
      <View style={styles.fallbackIconContainer}>
        <Smartphone size={48} color={Colors.semantic.tabInactive} strokeWidth={1.5} />
      </View>
      
      <Text style={styles.fallbackTitle}>Interactive Map Unavailable</Text>
      <Text style={styles.fallbackSubtitle}>
        Maps are temporarily disabled for Expo Go compatibility. Switch to List view to browse tasks.
      </Text>
      
      {pins.length > 0 && (
        <View style={styles.fallbackStats}>
          <MapPin size={16} color={Colors.primary} strokeWidth={2} />
          <Text style={styles.fallbackStatsText}>
            {pins.length} task{pins.length !== 1 ? 's' : ''} available on map
          </Text>
        </View>
      )}
      
      {onRequestDevClient && (
        <TouchableOpacity style={styles.devClientButton} onPress={onRequestDevClient}>
          <ExternalLink size={16} color={Colors.white} strokeWidth={2} />
          <Text style={styles.devClientButtonText}>TODO: Enable Maps</Text>
        </TouchableOpacity>
      )}
      
      <Text style={styles.fallbackNote}>
        💡 Use List view to browse all available tasks
      </Text>
    </View>
  </View>
);

export default function TasksMap({
  pins = [],
  onPressPin,
  showsUserLocation = false,
  locationPermission,
  onRequestLocation,
}: TasksMapProps) {
  // TODO: Re-enable location and map functionality
  // const [isMapReady, setIsMapReady] = useState(false);
  // const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  // const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  const handleDevClientInfo = () => {
    console.log('TODO: Enable maps with Dev Client');
  };

  // TODO: Re-enable map rendering when expo-maps is restored
  return (
    <MapPlaceholder pins={pins} onRequestDevClient={handleDevClientInfo} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors?.semantic?.screen ?? '#FFFFFF',
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  fallbackIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 8,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackSubtitle: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  fallbackStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  fallbackStatsText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  devClientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  devClientButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  fallbackNote: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  // TODO: Re-enable map-specific styles when expo-maps is restored
  // customMarker: { ... },
  // locationPrompt: { ... },
  // locationButton: { ... },
  // taskCountBadge: { ... },
});