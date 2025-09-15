// MapViewComponent.web.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  LoadScript,
  GoogleMap,
  MarkerF,
  InfoWindowF,
} from '@react-google-maps/api';

type TaskPin = {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  store?: string;
  urgency?: string;
  reward?: string;
};

type Props = { data?: TaskPin[] };

const UF_FALLBACK = { lat: 29.648833, lng: -82.343289 };

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
  zIndex: 9999,
};

const toLatLng = (p: { latitude: number; longitude: number }) => ({
  lat: p.latitude,
  lng: p.longitude,
});

export default function MapViewComponent({ data = [] }: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const didInitialFitRef = useRef(false);
  const markerTapGuardRef = useRef(false);
  const justDroppedAtRef = useRef(0);

  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [query, setQuery] = useState('');
  const [tapPoint, setTapPoint] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [openInfoTaskId, setOpenInfoTaskId] = useState<string | null>(null);
  const [openInfoDropped, setOpenInfoDropped] = useState<boolean>(false);

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

  const formatCoord = (n: number) => Number(n).toFixed(6);

  const openInMaps = (lat: number, lng: number, label = 'Location') => {
    const url = `https://www.google.com/maps?q=${encodeURIComponent(
      `${lat},${lng} (${label})`
    )}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
    (points: { lat: number; lng: number }[], animated = false) => {
      if (!mapRef.current || points.length === 0) return;
      const bounds = new window.google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      mapRef.current.fitBounds(bounds);
      if (animated) {
        // Google Maps JS API sudah animasi by default saat fitBounds
      }
    },
    []
  );

  // --- Lifecycle: initial center (user location / UF fallback)
  useEffect(() => {
    let mounted = true;
    if (!navigator.geolocation) {
      setCenter(UF_FALLBACK);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mounted) return;
        setCenter({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        if (!mounted) return;
        setCenter(UF_FALLBACK);
      },
      { enableHighAccuracy: false, timeout: 5000 }
    );
    return () => {
      mounted = false;
    };
  }, []);

  const handleLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    if (pins.length > 0 && !didInitialFitRef.current) {
      fitTo(pins.map(toLatLng), false);
      didInitialFitRef.current = true;
    }
  };

  useEffect(() => {
    if (!didInitialFitRef.current) return;
    if (filteredPins.length === 0) return;
    fitTo(filteredPins.map(toLatLng), true);
  }, [filteredPins, fitTo]);

  useEffect(() => {
    if (tapPoint && mapRef.current) {
      setTimeout(() => setOpenInfoDropped(true), 200);
      mapRef.current.panTo(tapPoint);
      mapRef.current.setZoom(16);
    }
  }, [tapPoint]);

  // --- Handlers ---
  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (markerTapGuardRef.current) return;
    if (!e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    // Hindari drop dekat pin task (<20m)
    const nearTask = pins.some(
      (p) => haversine(lat, lng, p.latitude, p.longitude) < 20
    );
    if (nearTask) return;

    setOpenInfoTaskId(null);
    setTapPoint({ lat, lng });
    justDroppedAtRef.current = Date.now();
    setOpenInfoDropped(true);
  };

  const onTaskMarkerClick = (pin: TaskPin) => {
    markerTapGuardRef.current = true;
    setTimeout(() => (markerTapGuardRef.current = false), 250);

    setTapPoint(null);
    setOpenInfoDropped(false);
    setOpenInfoTaskId(pin.id);

    if (mapRef.current) {
      mapRef.current.panTo({ lat: pin.latitude, lng: pin.longitude });
      mapRef.current.setZoom(16);
    }
  };

  const centerOnUser = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(next);
        if (mapRef.current) {
          mapRef.current.panTo(next);
          mapRef.current.setZoom(15);
        }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 5000 }
    );
  };

  if (!center) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '85%' }}>
        <div>Loading map…</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Search bar */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          zIndex: 10,
          background: 'white',
          borderRadius: 12,
          padding: '10px 12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks by title or store..."
          style={{
            flex: 1,
            fontSize: 16,
            border: 'none',
            outline: 'none',
            background: 'transparent',
          }}
        />
        {query.length > 0 && (
          <button
            onClick={() => setQuery('')}
            style={{
              fontSize: 14,
              color: '#2563EB',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 16,
          top: 60,
          background: 'white',
          padding: '6px 10px',
          borderRadius: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          zIndex: 10,
          fontSize: 12,
        }}
      >
        {filteredPins.length} result{filteredPins.length === 1 ? '' : 's'}
      </div>

      {/* My Location */}
      <button
        onClick={centerOnUser}
        style={{
          position: 'absolute',
          right: 16,
          bottom: 80,
          background: 'white',
          padding: '10px 12px',
          borderRadius: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 10,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        My Location
      </button>

      <LoadScript
        googleMapsApiKey={
          process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ''
        }
      >
        <GoogleMap
          onLoad={handleLoad}
          center={center}
          zoom={14}
          mapContainerStyle={{ width: '100%', height: '100%' }}
          onClick={onMapClick}
          onDrag={() => {
            if (Date.now() - justDroppedAtRef.current < 350) return;
            setTapPoint(null);
            setOpenInfoDropped(false);
          }}
          options={{
            fullscreenControl: false,
            mapTypeControl: false,
            streetViewControl: false,
          }}
        >
          {/* Task pins */}
          {filteredPins.map((pin) => {
            const isOpen = openInfoTaskId === pin.id;
            return (
              <MarkerF
                key={pin.id}
                position={{ lat: pin.latitude, lng: pin.longitude }}
                onClick={() => onTaskMarkerClick(pin)}
                zIndex={2}
              >
                {isOpen && (
                  <InfoWindowF onCloseClick={() => setOpenInfoTaskId(null)}>
                    <div style={{ maxWidth: 260 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {pin.title || pin.store || 'Task'}
                      </div>
                      <div>
                        {[pin.store, pin.urgency, pin.reward]
                          .filter(Boolean)
                          .join(' • ')}
                      </div>
                      <div
                        style={{ marginTop: 6, fontSize: 12, color: '#6B7280' }}
                      >
                        {formatCoord(pin.latitude)},{' '}
                        {formatCoord(pin.longitude)}
                      </div>
                      <button
                        onClick={() =>
                          openInMaps(
                            pin.latitude,
                            pin.longitude,
                            pin.title || pin.store || 'Task'
                          )
                        }
                        style={{
                          marginTop: 6,
                          background: 'transparent',
                          color: '#2563EB',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                      >
                        Open in Maps
                      </button>
                    </div>
                  </InfoWindowF>
                )}
              </MarkerF>
            );
          })}

          {/* Dropped pin */}
          {tapPoint && (
            <MarkerF position={tapPoint} zIndex={1}>
              {openInfoDropped && (
                <InfoWindowF onCloseClick={() => setOpenInfoDropped(false)}>
                  <div style={{ maxWidth: 260 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      Dropped Pin
                    </div>
                    <code style={{ fontFamily: 'Menlo, monospace' }}>
                      {formatCoord(tapPoint.lat)}, {formatCoord(tapPoint.lng)}
                    </code>

                    <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              `${tapPoint.lat},${tapPoint.lng}`
                            );
                          } catch {}
                        }}
                        style={{
                          background: 'transparent',
                          color: '#2563EB',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                      >
                        Copy coordinates
                      </button>

                      <button
                        onClick={() =>
                          openInMaps(tapPoint.lat, tapPoint.lng, 'Dropped Pin')
                        }
                        style={{
                          background: 'transparent',
                          color: '#2563EB',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                      >
                        Open in Maps
                      </button>
                    </div>
                  </div>
                </InfoWindowF>
              )}
            </MarkerF>
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}
