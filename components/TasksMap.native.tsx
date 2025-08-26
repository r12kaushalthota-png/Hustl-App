import React, { useEffect, useState } from 'react';
import { MapView, Marker, Circle } from 'expo-maps';
import * as Location from 'expo-location';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
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
  const [isReady, setIsReady] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    const initializeMap = async () => {
      try {
        if (locationPermission !== 'granted') {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({});
            setUserLocation(location);
          }
        } else {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation(location);
        }
      } catch (error) {
        console.warn('Location permission error:', error);
      } finally {
        setIsReady(true);
      }
    };

    initializeMap();
  }, [locationPermission]);

  const getUrgencyColor = (urgency: string): string => {
    switch (urgency) {
      case 'low':
        return '#10B981';
      case 'medium':
        return '#F59E0B';
      case 'high':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
      >
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            title={pin.title}
            description={`${pin.reward} • ${pin.store}`}
            color={getUrgencyColor(pin.urgency)}
            onPress={() => onPressPin?.(pin.id)}
          />
        ))}
        
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.semantic.screen,
  },
});