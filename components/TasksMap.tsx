import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { MapPin, Navigation, Smartphone, ExternalLink, Wifi, WifiOff } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

// Conditional import for expo-maps (only when not in Expo Go)
let MapView: any = null;
let Marker: any = null;
let Circle: any = null;

// Detect if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Only import expo-maps if not in Expo Go
if (!isExpoGo) {
  try {
    const expoMaps = require('expo-maps');
    MapView = expoMaps.MapView;
    Marker = expoMaps.Marker;
    Circle = expoMaps.Circle;
  } catch (error) {
    console.warn('expo-maps not available:', error);
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
  locationPermission?: Location.PermissionStatus | null;
  onRequestLocation?: () => void;
}

const UF_CAMPUS = {
  latitude: 29.6436,
  longitude: -82.3549
};

// Expo Go Fallback Component
const ExpoGoFallback = ({ pins = [], onRequestDevClient }: { pins: TaskPin[]; onRequestDevClient?: () => void }) => (
  <View style={styles.fallbackContainer}>
    <View style={styles.fallbackContent}>
      <View style={styles.fallbackIconContainer}>
        <Smartphone size={48} color={Colors.semantic.tabInactive} strokeWidth={1.5} />
      </View>
      
      <Text style={styles.fallbackTitle}>Interactive Map Unavailable</Text>
      <Text style={styles.fallbackSubtitle}>
        Interactive maps require a Dev Client build. Switch to List view to browse tasks, or build with Dev Client for full map functionality.
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
          <Text style={styles.devClientButtonText}>Learn about Dev Client</Text>
        </TouchableOpacity>
      )}
      
      <Text style={styles.fallbackNote}>
        💡 Use List view above to browse all available tasks
      </Text>
    </View>
  </View>
);

// Network Error Fallback
const NetworkErrorFallback = ({ onRetry }: { onRetry: () => void }) => (
  <View style={styles.fallbackContainer}>
    <View style={styles.fallbackContent}>
      <View style={styles.fallbackIconContainer}>
        <WifiOff size={48} color={Colors.semantic.errorAlert} strokeWidth={1.5} />
      </View>
      
      <Text style={styles.fallbackTitle}>Connection Issue</Text>
      <Text style={styles.fallbackSubtitle}>
        Unable to connect to development server. Check your network connection or switch to LAN mode.
      </Text>
      
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Wifi size={16} color={Colors.white} strokeWidth={2} />
        <Text style={styles.retryButtonText}>Retry Connection</Text>
      </TouchableOpacity>
      
      <Text style={styles.fallbackNote}>
        💡 Try switching to LAN mode in Expo CLI if tunnel mode fails
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
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    initializeLocation();
  }, [locationPermission]);

  const initializeLocation = async () => {
    setIsLoadingLocation(true);
    setNetworkError(false);
    
    try {
      if (locationPermission === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation(location);
      }
    } catch (error) {
      console.warn('Failed to get current location:', error);
      // Check if it's a network-related error
      if (error instanceof Error && error.message.includes('network')) {
        setNetworkError(true);
      }
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

  const handleDevClientInfo = () => {
    // Open documentation about Dev Client
    Linking.openURL('https://docs.expo.dev/clients/introduction/');
  };

  const handleRetryConnection = () => {
    setNetworkError(false);
    initializeLocation();
  };

  // Show loading state until ready
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

  // Show network error fallback
  if (networkError) {
    return <NetworkErrorFallback onRetry={handleRetryConnection} />;
  }

  // Show Expo Go fallback if running in Expo Go
  if (isExpoGo || !MapView) {
    return <ExpoGoFallback pins={pins} onRequestDevClient={handleDevClientInfo} />;
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider="google"
        initialCameraPosition={{
          center: UF_CAMPUS,
          zoom: 14,
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