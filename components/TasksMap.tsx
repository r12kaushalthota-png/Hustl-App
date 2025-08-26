import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { MapView, Marker, Circle } from 'expo-maps';
import * as Location from 'expo-location';
import { MapPin, Navigation } from 'lucide-react-native';
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
  locationPermission?: Location.PermissionStatus | null;
  onRequestLocation?: () => void;
}

const UF_CAMPUS = {
  latitude: 29.6436,
  longitude: -82.3549
};

export default function TasksMap({
  pins = [],
  onPressPin,
  showsUserLocation = false,
  locationPermission,
  onRequestLocation,
}: TasksMapProps) {
  const [isMapReady, setIsMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  useEffect(() => {
    initializeLocation();
  }, [locationPermission]);

  const initializeLocation = async () => {
    setIsLoadingLocation(true);
    
    try {
      if (locationPermission === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation(location);
      }
    } catch (error) {
      console.warn('Failed to get current location:', error);
    } finally {
      setIsLoadingLocation(false);
      setIsMapReady(true);
    }
  };

  const getUrgencyColor = (urgency: string): string => {
    switch (urgency) {
      case 'low':
        return '#10B981'; // Green
      case 'medium':
        return '#F59E0B'; // Orange
      case 'high':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const handleLocationRequest = () => {
    if (onRequestLocation) {
      onRequestLocation();
    } else {
      Alert.alert(
        'Location Permission',
        'Enable location access to see your position on the map and find nearby tasks.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
        ]
      );
    }
  };

  if (!isMapReady || isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>
          {isLoadingLocation ? 'Getting your location...' : 'Loading map...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider="google"
        initialCameraPosition={{
          center: UF_CAMPUS,
          zoom: 14
        }}
        showsUserLocation={showsUserLocation && locationPermission === 'granted'}
        showsMyLocationButton={false}
        showsCompass={false}
        onMapReady={() => setIsMapReady(true)}
      >
        {/* Task Markers */}
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            title={pin.title}
            description={`${pin.reward} • ${pin.store}`}
            onPress={() => onPressPin?.(pin.id)}
          >
            <View style={[
              styles.customMarker,
              { backgroundColor: getUrgencyColor(pin.urgency) }
            ]}>
              <MapPin size={16} color={Colors.white} strokeWidth={2} />
            </View>
          </Marker>
        ))}
        
        {/* User Location Circle */}
        {userLocation && showsUserLocation && locationPermission === 'granted' && (
          <Circle
            center={{
              latitude: userLocation.coords.latitude,
              longitude: userLocation.coords.longitude
            }}
            radius={100}
            fillColor="rgba(59, 130, 246, 0.2)"
            strokeColor="rgba(59, 130, 246, 0.8)"
            strokeWidth={2}
          />
        )}
      </MapView>

      {/* Location Permission Prompt */}
      {locationPermission !== 'granted' && (
        <View style={styles.locationPrompt}>
          <TouchableOpacity style={styles.locationButton} onPress={handleLocationRequest}>
            <Navigation size={16} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.locationButtonText}>Enable Location</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Task Count Badge */}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.semantic.screen,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
  },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  locationPrompt: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  taskCountBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  taskCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
});