import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
  InfoWindow,
  Polyline,
} from '@react-google-maps/api';
import socketService, { DriverLocationPayload } from '../../services/socket';

export interface LiveMapProps {
  latitude: number;
  longitude: number;
  pickupLat?: number;
  pickupLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  status?: string;
  bookingId?: string;
  hospitalId?: string;
  patientId?: string;
  height?: string;
  onEtaUpdate?: (eta: string, distance: string) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultMapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi.medical',
      elementType: 'geometry',
      stylers: [{ color: '#f5f5f5' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#e9e9e9' }, { lightness: 17 }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.fill',
      stylers: [{ color: '#ffffff' }, { lightness: 17 }],
    },
  ],
};

const libraries: ('places' | 'geometry' | 'drawing')[] = ['geometry'];

// Haversine distance calculator in kilometers
const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

export const LiveMap: React.FC<LiveMapProps> = ({
  latitude = 19.0522,
  longitude = 72.8295,
  pickupLat = 19.0600,
  pickupLng = 72.8340,
  destinationLat,
  destinationLng,
  driverName = 'Rajesh Kumar',
  driverPhone = '+91 98201 10800',
  vehicleNumber = 'MH-01-EQ-1108',
  status = 'EN ROUTE TO PICKUP',
  bookingId = 'SOS-108',
  hospitalId = 'hosp_lilavati',
  patientId,
  height = '260px',
  onEtaUpdate,
}) => {
  // Current real-time driver coordinates
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number }>({
    lat: latitude,
    lng: longitude,
  });

  const [pickupPos, setPickupPos] = useState<{ lat: number; lng: number }>({
    lat: pickupLat,
    lng: pickupLng,
  });

  // Google Maps & Directions State
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [trafficEta, setTrafficEta] = useState<string>('4 mins');
  const [liveDistance, setLiveDistance] = useState<string>('1.8 km');
  const [trafficCondition, setTrafficCondition] = useState<'SMOOTH' | 'MODERATE' | 'HEAVY'>('MODERATE');
  const [selectedMarker, setSelectedMarker] = useState<'DRIVER' | 'PICKUP' | null>(null);
  const [lastRouteRequestTime, setLastRouteRequestTime] = useState<number>(0);
  const lastRequestedOriginRef = useRef<{ lat: number; lng: number } | null>(null);

  // Google Maps API Loader
  const googleApiKey = (import.meta.env.VITE_MAP_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: googleApiKey || 'DUMMY_KEY_TELEMETRY',
    libraries,
    preventGoogleFontsLoading: true,
  });

  // Sync props to state if props change
  useEffect(() => {
    if (latitude && longitude) {
      setDriverPos({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (pickupLat && pickupLng) {
      setPickupPos({ lat: pickupLat, lng: pickupLng });
    }
  }, [pickupLat, pickupLng]);

  // 📡 Socket.IO Real-time Room Setup & Location Subscription
  useEffect(() => {
    const socket = socketService.connect();

    // Auto-join designated rooms
    if (bookingId) socketService.joinRide(bookingId);
    if (hospitalId) socketService.joinHospital(hospitalId);
    if (patientId) socketService.joinPatient(patientId);

    // Listen to real-time driver location stream
    const handleLocationUpdate = (payload: DriverLocationPayload) => {
      const lat = payload.latitude ?? payload.lat;
      const lng = payload.longitude ?? payload.lng;
      if (typeof lat === 'number' && typeof lng === 'number') {
        setDriverPos({ lat, lng });
      }
    };

    socketService.onDriverLocation(handleLocationUpdate);

    return () => {
      socket.off('driverLocation', handleLocationUpdate);
      socket.off('locationUpdate', handleLocationUpdate);
    };
  }, [bookingId, hospitalId, patientId]);

  /**
   * 🚀 DYNAMIC ETA (LIVE TRAFFIC)
   * Calculates real-time driving route using Google Directions API with drivingOptions:
   *  - departureTime: new Date()
   *  - trafficModel: 'bestguess'
   * Extracts duration_in_traffic as the FINAL ETA.
   */
  const calculateLiveTrafficRoute = useCallback(() => {
    if (!isLoaded || loadError || !window.google?.maps?.DirectionsService) {
      // Fallback calculation via Haversine distance
      const distKm = calculateDistanceKm(driverPos.lat, driverPos.lng, pickupPos.lat, pickupPos.lng);
      const estMinutes = Math.max(2, Math.round(distKm * 2.4 + 1));
      const distStr = `${distKm} km`;
      const etaStr = `${estMinutes} mins`;
      setLiveDistance(distStr);
      setTrafficEta(etaStr);
      setTrafficCondition(distKm > 3 ? 'MODERATE' : 'SMOOTH');
      if (onEtaUpdate) onEtaUpdate(etaStr, distStr);
      return;
    }

    // Throttle route API calls to every 3-5 seconds or when moved > 25 meters
    const now = Date.now();
    if (now - lastRouteRequestTime < 3500) {
      return;
    }

    if (lastRequestedOriginRef.current) {
      const movedDist = calculateDistanceKm(
        driverPos.lat,
        driverPos.lng,
        lastRequestedOriginRef.current.lat,
        lastRequestedOriginRef.current.lng
      );
      if (movedDist < 0.025 && directionsResult) {
        return; // Don't re-query if moved less than 25 meters
      }
    }

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: new window.google.maps.LatLng(driverPos.lat, driverPos.lng),
        destination: new window.google.maps.LatLng(pickupPos.lat, pickupPos.lng),
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
        },
      },
      (result, status) => {
        setLastRouteRequestTime(now);
        lastRequestedOriginRef.current = { lat: driverPos.lat, lng: driverPos.lng };

        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirectionsResult(result);

          const routeLeg = result.routes[0]?.legs[0];
          if (routeLeg) {
            const distance = routeLeg.distance?.text || '1.8 km';
            const duration = routeLeg.duration?.text || '5 mins';
            const duration_in_traffic = routeLeg.duration_in_traffic?.text || duration;

            // 👉 Use duration_in_traffic as FINAL ETA
            setTrafficEta(duration_in_traffic);
            setLiveDistance(distance);

            // Estimate traffic congestion level
            if (routeLeg.duration_in_traffic && routeLeg.duration) {
              const diffSec = routeLeg.duration_in_traffic.value - routeLeg.duration.value;
              if (diffSec > 180) {
                setTrafficCondition('HEAVY');
              } else if (diffSec > 60) {
                setTrafficCondition('MODERATE');
              } else {
                setTrafficCondition('SMOOTH');
              }
            }

            if (onEtaUpdate) {
              onEtaUpdate(duration_in_traffic, distance);
            }
          }
        } else {
          // Fallback on API query failure
          const distKm = calculateDistanceKm(driverPos.lat, driverPos.lng, pickupPos.lat, pickupPos.lng);
          const estMinutes = Math.max(2, Math.round(distKm * 2.4 + 1));
          setLiveDistance(`${distKm} km`);
          setTrafficEta(`${estMinutes} mins`);
          if (onEtaUpdate) onEtaUpdate(`${estMinutes} mins`, `${distKm} km`);
        }
      }
    );
  }, [driverPos, pickupPos, isLoaded, loadError, lastRouteRequestTime, directionsResult, onEtaUpdate]);

  useEffect(() => {
    calculateLiveTrafficRoute();
  }, [driverPos.lat, driverPos.lng, pickupPos.lat, pickupPos.lng, calculateLiveTrafficRoute]);

  // Fit bounds when map or positions change
  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      setMapInstance(map);
      try {
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(new window.google.maps.LatLng(driverPos.lat, driverPos.lng));
        bounds.extend(new window.google.maps.LatLng(pickupPos.lat, pickupPos.lng));
        map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
      } catch {
        // Safe fallback
      }
    },
    [driverPos, pickupPos]
  );

  // Custom SVG Marker Icons
  const ambulanceMarkerIcon = useMemo(() => {
    if (typeof window === 'undefined' || !window.google?.maps) return undefined;
    return {
      url:
        'data:image/svg+xml;charset=UTF-8,' +
        encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="20" fill="#EF4444" stroke="#FFFFFF" stroke-width="3" />
          <path d="M14 22h16M22 14v16" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" />
          <circle cx="34" cy="10" r="5" fill="#10B981" stroke="#FFFFFF" stroke-width="2" />
        </svg>
      `),
      scaledSize: new window.google.maps.Size(44, 44),
      anchor: new window.google.maps.Point(22, 22),
    };
  }, []);

  const pickupMarkerIcon = useMemo(() => {
    if (typeof window === 'undefined' || !window.google?.maps) return undefined;
    return {
      url:
        'data:image/svg+xml;charset=UTF-8,' +
        encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
          <circle cx="19" cy="19" r="16" fill="#2563EB" stroke="#FFFFFF" stroke-width="3" />
          <circle cx="19" cy="19" r="6" fill="#FFFFFF" />
        </svg>
      `),
      scaledSize: new window.google.maps.Size(38, 38),
      anchor: new window.google.maps.Point(19, 19),
    };
  }, []);

  const hasValidGoogleMaps = isLoaded && !loadError && typeof window.google?.maps?.Map === 'function';

  return (
    <div className="w-full flex flex-col font-sans">
      {/* 🎨 1. LIVE TRAFFIC & DYNAMIC ETA INFO PANEL (Header Bar) */}
      <div className="bg-white border-b border-blue-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-lg border border-blue-200">
            <span className="text-sm">🚑</span>
            <span>Distance: <strong className="text-blue-900">{liveDistance}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs px-2.5 py-1 rounded-lg border border-emerald-200">
            <span className="text-sm">⏱️</span>
            <span>Live Traffic ETA: <strong className="text-emerald-900">{trafficEta}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {trafficCondition === 'SMOOTH' && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Normal Traffic Flow
            </span>
          )}
          {trafficCondition === 'MODERATE' && (
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Moderate Congestion
            </span>
          )}
          {trafficCondition === 'HEAVY' && (
            <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span> Heavy Traffic Corridor
            </span>
          )}

          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
            {vehicleNumber}
          </span>
        </div>
      </div>

      {/* 🗺️ 2. MAP CANVAS SECTION */}
      <div style={{ height }} className="relative w-full bg-slate-100 overflow-hidden">
        {hasValidGoogleMaps ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={driverPos}
            zoom={14}
            options={defaultMapOptions}
            onLoad={onMapLoad}
          >
            {/* Real-time Directions Route Line */}
            {directionsResult && (
              <DirectionsRenderer
                directions={directionsResult}
                options={{
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: '#2563EB',
                    strokeWeight: 5,
                    strokeOpacity: 0.85,
                  },
                }}
              />
            )}

            {/* Moving Driver Ambulance Marker */}
            <Marker
              position={driverPos}
              icon={ambulanceMarkerIcon}
              title={`Ambulance: ${vehicleNumber} (${driverName})`}
              onClick={() => setSelectedMarker('DRIVER')}
            />

            {/* Patient Pickup Marker */}
            <Marker
              position={pickupPos}
              icon={pickupMarkerIcon}
              title="Patient Pickup Point"
              onClick={() => setSelectedMarker('PICKUP')}
            />

            {/* Driver Info Window */}
            {selectedMarker === 'DRIVER' && (
              <InfoWindow position={driverPos} onCloseClick={() => setSelectedMarker(null)}>
                <div className="p-1 text-xs">
                  <p className="font-bold text-slate-900 flex items-center gap-1">
                    <span>🚑</span> {vehicleNumber}
                  </p>
                  <p className="text-slate-600">Driver: {driverName}</p>
                  <p className="text-slate-500 text-[10px]">{status}</p>
                  <p className="text-blue-600 font-bold mt-1">Live ETA: {trafficEta}</p>
                </div>
              </InfoWindow>
            )}

            {/* Pickup Info Window */}
            {selectedMarker === 'PICKUP' && (
              <InfoWindow position={pickupPos} onCloseClick={() => setSelectedMarker(null)}>
                <div className="p-1 text-xs">
                  <p className="font-bold text-blue-900 flex items-center gap-1">
                    <span>📍</span> Patient Pickup Location
                  </p>
                  <p className="text-slate-600">Distance: {liveDistance}</p>
                  <p className="text-emerald-700 font-semibold text-[10px]">Destination En Route</p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          /* ⚡ Highly responsive interactive SVG Fallback Canvas when Google Key is Standby */
          <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col items-center justify-center p-4 text-white overflow-hidden select-none">
            {/* Animated Radar Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:28px_28px] opacity-40"></div>

            {/* SVG Connecting Route Path */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line
                x1="28%"
                y1="65%"
                x2="72%"
                y2="35%"
                stroke="#3B82F6"
                strokeWidth="4"
                strokeDasharray="6 6"
                className="animate-pulse"
              />
            </svg>

            {/* Moving Driver Beacon */}
            <div className="absolute left-[28%] top-[65%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-bounce">
              <div className="w-10 h-10 rounded-xl bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-lg">
                🚑
              </div>
              <span className="mt-1 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/20 whitespace-nowrap">
                {vehicleNumber} (Moving)
              </span>
            </div>

            {/* Patient Pickup Beacon */}
            <div className="absolute left-[72%] top-[35%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-base">
                📍
              </div>
              <span className="mt-1 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-blue-200 border border-white/20 whitespace-nowrap">
                Pickup Point
              </span>
            </div>

            {/* Bottom Status Overlay */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-slate-300">Live Telemetry GPS Feed: <strong className="text-white">{driverPos.lat.toFixed(4)}, {driverPos.lng.toFixed(4)}</strong></span>
              </div>
              <span className="text-blue-400 font-bold">ETA: {trafficEta} ({liveDistance})</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveMap;
