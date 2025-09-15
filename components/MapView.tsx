import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import MapView, {
  Region,
  Marker,
  Callout,
  MapPressEvent,
} from 'react-native-maps';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';

type TaskPin = {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  store?: string;
  urgency?: string;
  reward?: string;
};

export default function MapViewComponent({ data = [] }: { data?: TaskPin[] }) {
  const mapRef = useRef<MapView>(null);
  const dropMarkerRef = useRef<Marker>(null);
  const justDroppedAtRef = useRef(0);

  // Guards untuk onPress Map agar tidak mengganggu pin task
  const markerTapGuardRef = useRef(false);
  const pressCooldownRef = useRef(0);

  const didInitialFitRef = useRef(false);

  const [region, setRegion] = useState<Region | null>(null);
  const [query, setQuery] = useState('');
  const [tapPoint, setTapPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // --- Data helpers ---
  const pins = useMemo(
    () =>
      data.filter(
        (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
      ),
    [data]
  );

  const filteredPins = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pins;
    return pins.filter((p) => {
      const title = (p.title ?? '').toLowerCase();
      const store = (p.store ?? '').toLowerCase();
      return title.includes(q) || store.includes(q);
    });
  }, [pins, query]);

  const formatCoord = (n: number) => n.toFixed(6);

  const openInMaps = (lat: number, lng: number, label = 'Location') => {
    const url = Platform.select({
      ios: `http://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(
        label
      )}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(
        label
      )})`,
    })!;
    Linking.openURL(url);
  };

  const haversine = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };

  const fitTo = useCallback(
    (points: { latitude: number; longitude: number }[], animated = false) => {
      if (!mapRef.current || points.length === 0) return;
      const coords = points.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      }));
      requestAnimationFrame(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
          animated,
        });
      });
    },
    []
  );

  // --- Lifecycle ---
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setRegion({
          latitude: 29.648833, // UF Gainesville fallback
          longitude: -82.343289,
          latitudeDelta: 0.025,
          longitudeDelta: 0.03,
        });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setRegion({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.0125,
      });
    })();
  }, []);

  const handleMapReady = useCallback(() => {
    if (didInitialFitRef.current) return;
    if (pins.length > 0) {
      fitTo(pins, false);
      didInitialFitRef.current = true;
    }
  }, [pins, fitTo]);

  useEffect(() => {
    if (!didInitialFitRef.current) return;
    if (filteredPins.length === 0) return;
    fitTo(filteredPins, true);
  }, [filteredPins, fitTo]);

  useEffect(() => {
    if (tapPoint) {
      const t = setTimeout(() => dropMarkerRef.current?.showCallout(), 200);
      mapRef.current?.animateCamera(
        {
          center: {
            latitude: tapPoint.latitude,
            longitude: tapPoint.longitude,
          },
          zoom: 16,
        },
        { duration: 400 }
      );
      return () => clearTimeout(t);
    }
  }, [tapPoint]);

  // --- Handlers ---
  const onMapPress = useCallback(
    (e: MapPressEvent) => {
      if (markerTapGuardRef.current) return;
      // @ts-ignore

      // const now = Date.now();
      // if (now - pressCooldownRef.current < 150) return;
      // pressCooldownRef.current = now;

      const { latitude, longitude } = e.nativeEvent.coordinate;

      // opsional: hindari drop di dekat task pin (<20m)
      const nearTask = pins.some(
        (p) => haversine(latitude, longitude, p.latitude, p.longitude) < 20
      );
      if (nearTask) return;

      // 1) set pin
      setTapPoint({ latitude, longitude });
      // // 2) catat waktu drop
      // justDroppedAtRef.current = Date.now();
      // // 3) show callout setelah marker ter-render
      // setTimeout(() => dropMarkerRef.current?.showCallout(), 200);
    },
    [pins]
  );

  const onTaskMarkerPress = useCallback((lat: number, lng: number) => {
    markerTapGuardRef.current = true;
    setTimeout(() => {
      markerTapGuardRef.current = false;
    }, 250);

    setTapPoint(null);
    mapRef.current?.animateCamera(
      { center: { latitude: lat, longitude: lng }, zoom: 16 },
      { duration: 400 }
    );
  }, []);

  const onTaskCalloutPress = useCallback(
    (lat: number, lng: number, label?: string) => {
      markerTapGuardRef.current = true;
      setTimeout(() => {
        markerTapGuardRef.current = false;
      }, 250);
      openInMaps(lat, lng, label || 'Task');
    },
    []
  );

  const centerOnUser = async () => {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const nextRegion: Region = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.0125,
    };
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 600);
  };

  if (!region) return <ActivityIndicator style={{ flex: 1 }} />;

  // --- UI ---
  return (
    <View
      style={{
        width: '100%',
        height: '85%',
        position: 'relative',
        zIndex: 9999,
      }}
    >
      {/* Search bar */}
      <View
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          zIndex: 10,
          backgroundColor: 'white',
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 3,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search tasks by title or store..."
          placeholderTextColor="#9CA3AF"
          style={{ flex: 1, fontSize: 16 }}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={{ fontSize: 14, color: '#2563EB' }}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={region}
        showsUserLocation
        followsUserLocation={false}
        onMapReady={handleMapReady}
        onPress={onMapPress}
        onPanDrag={() => {
          if (Date.now() - justDroppedAtRef.current < 350) return;
          setTapPoint(null);
        }}
      >
        {/* Task pins */}
        {filteredPins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            title={pin.title || pin.store || 'Task'}
            description={[pin.store, pin.urgency, pin.reward]
              .filter(Boolean)
              .join(' • ')}
            zIndex={2} 
            onPress={() => onTaskMarkerPress(pin.latitude, pin.longitude)}
          >
            <Callout
              onPress={() =>
                onTaskCalloutPress(
                  pin.latitude,
                  pin.longitude,
                  pin.title || pin.store || 'Task'
                )
              }
            >
              <View style={{ maxWidth: 260 }}>
                <Text style={{ fontWeight: '600', marginBottom: 4 }}>
                  {pin.title || pin.store || 'Task'}
                </Text>
                <Text>
                  {[pin.store, pin.urgency, pin.reward]
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
                <Text style={{ marginTop: 6, fontSize: 12, color: '#6B7280' }}>
                  {formatCoord(pin.latitude)}, {formatCoord(pin.longitude)}
                </Text>
                <Text style={{ marginTop: 6, color: '#2563EB' }}>
                  Open in Maps
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {tapPoint && (
          <Marker
            ref={dropMarkerRef}
            coordinate={tapPoint}
            pinColor="#2563EB"
            zIndex={1}
          >
            <Callout>
              <View style={{ maxWidth: 260 }}>
                <Text style={{ fontWeight: '600', marginBottom: 4 }}>
                  Dropped Pin
                </Text>
                <Text
                  style={{
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  }}
                >
                  {formatCoord(tapPoint.latitude)},{' '}
                  {formatCoord(tapPoint.longitude)}
                </Text>

                <TouchableOpacity
                  onPress={async () => {
                    await Clipboard.setStringAsync(
                      `${tapPoint.latitude},${tapPoint.longitude}`
                    );
                  }}
                  style={{ marginTop: 8 }}
                >
                  <Text style={{ color: '#2563EB' }}>Copy coordinates</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    openInMaps(
                      tapPoint.latitude,
                      tapPoint.longitude,
                      'Dropped Pin'
                    )
                  }
                  style={{ marginTop: 6 }}
                >
                  <Text style={{ color: '#2563EB' }}>Open in Maps</Text>
                </TouchableOpacity>
              </View>
            </Callout>
          </Marker>
        )}
      </MapView>

      <TouchableOpacity
        onPress={centerOnUser}
        style={{
          position: 'absolute',
          right: 16,
          bottom: 10,
          backgroundColor: 'white',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 10,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 6,
          elevation: 3,
        }}
      >
        <Text>My Location</Text>
      </TouchableOpacity>

      {/* Badge jumlah hasil */}
      <View
        style={{
          position: 'absolute',
          left: 16,
          top: 60,
          backgroundColor: 'white',
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 10,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <Text style={{ fontSize: 12 }}>
          {filteredPins.length} result{filteredPins.length === 1 ? '' : 's'}
        </Text>
      </View>
    </View>
  );
}
