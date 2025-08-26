import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { MapPin, Navigation, Smartphone, ExternalLink, Wifi, WifiOff } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

// Conditional imports to prevent crashes in Expo Go
let Location: any = null;
let MapView: any = null;
let Marker: any = null;
let Circle: any = null;

// Only import expo modules when not in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    Location = require('expo-location');
    const expoMaps = require('expo-maps');
    MapView = expoMaps.MapView;
    Marker = expoMaps.Marker;
    Circle = expoMaps.Circle;
  } catch (error) {
    console.warn('Native modules not available:', error);
  }
}

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

const UF_CAMPUS = {
  latitude: 29.6436,
  longitude: -82.3549
};

// Expo Go fallback component
const ExpoGoFallback = ({ pins = [] }: { pins: TaskPin[] }) => (
  <View style={styles.fallbackContainer}>
    <View style={styles.fallbackContent}>
      <View style={styles.fallbackIconContainer}>
        <Smartphone size={48} color={Colors.semantic.tabInactive} strokeWidth={1.5} />
      </View>
      
      <Text style={styles.fallbackTitle}>Map Preview Unavailable in Expo Go</Text>
      <Text style={styles.fallbackSubtitle}>
        Please build and run with a Dev Client to see interactive maps.
      </Text>
      
      {pins.length > 0 && (
        <View style={styles.fallbackStats}>
          <MapPin size={16} color={Colors.primary} strokeWidth={2} />
          <Text style={styles.fallbackStatsText}>
            {pins.length} task{pins.length !== 1 ? 's' : ''} available on map
          </Text>
        </View>
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
  const [isMapReady, setIsMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  // Load user location when component mounts (only in Dev Client)
  useEffect(() => {
    if (isExpoGo || !Location) {
      setIsLoadingLocation(false);
      return;
    }

    loadUserLocation();
  }, []);

  const loadUserLocation = async () => {
    if (!Location) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
      }
    } catch (error) {
      console.warn('Location error:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handlePinPress = (pin: TaskPin) => {
    onPressPin?.(pin.id);
  };

  const getUrgencyColor = (urgency: string): string => {
    switch (urgency) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return Colors.primary;
    }
  };

  // Show Expo Go fallback if running in Expo Go
  if (isExpoGo || !MapView) {
    return <ExpoGoFallback pins={pins} />;
  }

  // Render full map in Dev Client
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          ...UF_CAMPUS,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={showsUserLocation && !!userLocation}
        showsMyLocationButton={false}
        onMapReady={() => setIsMapReady(true)}
      >
        {/* User location circle */}
        {showsUserLocation && userLocation && (
          <Circle
            center={{
              latitude: userLocation.coords.latitude,
              longitude: userLocation.coords.longitude,
            }}
            radius={100}
            fillColor="rgba(0, 33, 165, 0.2)"
            strokeColor={Colors.primary}
            strokeWidth={2}
          />
        )}

        {/* Task pins */}
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{
              latitude: pin.latitude,
              longitude: pin.longitude,
            }}
            onPress={() => handlePinPress(pin)}
          >
            <View style={[
              styles.customMarker,
              { borderColor: getUrgencyColor(pin.urgency) }
            ]}>
              <Text style={styles.markerText}>{pin.reward}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Location permission prompt */}
      {!showsUserLocation && locationPermission !== 'granted' && (
        <View style={styles.locationPrompt}>
          <TouchableOpacity style={styles.locationButton} onPress={onRequestLocation}>
            <MapPin size={16} color={Colors.white} strokeWidth={2} />
            <Text style={styles.locationButtonText}>Enable Location</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Task count badge */}
      {pins.length > 0 && (
        <View style={styles.taskCountBadge}>
          <Text style={styles.taskCountText}>
            {pins.length} task{pins.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  map: {
    flex: 1,
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
  fallbackNote: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  customMarker: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  markerText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.semantic.bodyText,
  },
  locationPrompt: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    justifyContent: 'center',
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  taskCountBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  taskCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
});