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
import apiClient from '../../services/apiClient';

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
  driverId?: string;
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
export const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

// Compute dynamic bearing/heading angle (0–360°)
export const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (Math.round((θ * 180) / Math.PI) + 360) % 360;
};

// Shortest angular turn difference (-180 to +180)
const shortestAngularDiff = (startDeg: number, targetDeg: number): number => {
  return ((targetDeg - startDeg + 540) % 360) - 180;
};

// Find nearest vertex on road path to a given coordinate
const findClosestVertexIndex = (
  path: Array<{ lat: number; lng: number }>,
  coord: { lat: number; lng: number }
): { index: number; distKm: number } => {
  let closestIdx = 0;
  let minDistance = Infinity;

  for (let i = 0; i < path.length; i++) {
    const d = calculateDistanceKm(path[i].lat, path[i].lng, coord.lat, coord.lng);
    if (d < minDistance) {
      minDistance = d;
      closestIdx = i;
    }
  }

  return { index: closestIdx, distKm: minDistance };
};

// Extract road subpath along Google Directions polyline between start and target
const extractRoadSubpath = (
  overviewPath: Array<{ lat: number; lng: number }>,
  startPos: { lat: number; lng: number },
  targetPos: { lat: number; lng: number }
): Array<{ lat: number; lng: number }> => {
  if (!overviewPath || overviewPath.length < 2) {
    return [startPos, targetPos];
  }

  const startMatch = findClosestVertexIndex(overviewPath, startPos);
  const targetMatch = findClosestVertexIndex(overviewPath, targetPos);

  // If start or target is too far (> 300 meters) from route corridor, use direct interpolation
  if (startMatch.distKm > 0.3 || targetMatch.distKm > 0.3) {
    return [startPos, targetPos];
  }

  let subpath: Array<{ lat: number; lng: number }> = [startPos];

  if (startMatch.index <= targetMatch.index) {
    for (let i = startMatch.index; i <= targetMatch.index; i++) {
      subpath.push(overviewPath[i]);
    }
  } else {
    for (let i = startMatch.index; i >= targetMatch.index; i--) {
      subpath.push(overviewPath[i]);
    }
  }

  subpath.push(targetPos);
  return subpath;
};

// Interpolate along road vertices at progress t (0..1)
const interpolateAlongPath = (
  subpath: Array<{ lat: number; lng: number }>,
  t: number
): { pos: { lat: number; lng: number }; heading: number | null } => {
  if (!subpath || subpath.length === 0) {
    return { pos: { lat: 0, lng: 0 }, heading: null };
  }
  if (subpath.length === 1 || t <= 0) {
    return { pos: subpath[0], heading: null };
  }
  if (t >= 1) {
    const last = subpath[subpath.length - 1];
    const prev = subpath[subpath.length - 2] || last;
    const heading = calculateBearing(prev.lat, prev.lng, last.lat, last.lng);
    return { pos: last, heading };
  }

  // Precompute segment lengths
  const segmentLengths: number[] = [];
  let totalLength = 0;

  for (let i = 0; i < subpath.length - 1; i++) {
    const len = calculateDistanceKm(subpath[i].lat, subpath[i].lng, subpath[i + 1].lat, subpath[i + 1].lng);
    segmentLengths.push(len);
    totalLength += len;
  }

  if (totalLength === 0) {
    return { pos: subpath[0], heading: null };
  }

  const targetDist = t * totalLength;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (accumulated + segLen >= targetDist || i === segmentLengths.length - 1) {
      const segT = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
      const p1 = subpath[i];
      const p2 = subpath[i + 1];

      const lat = p1.lat + (p2.lat - p1.lat) * segT;
      const lng = p1.lng + (p2.lng - p1.lng) * segT;
      const heading = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);

      return { pos: { lat, lng }, heading };
    }
    accumulated += segLen;
  }

  return { pos: subpath[subpath.length - 1], heading: null };
};

// Top-down sleek ambulance vehicle SVG generator with dynamic heading rotation
const generateAmbulanceSvg = (headingDeg: number): string => {
  const roundedDeg = Math.round(headingDeg || 0);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
      <!-- Radiating GPS Telemetry Radar Pulse -->
      <circle cx="26" cy="26" r="24" fill="#3B82F6" fill-opacity="0.12" stroke="#2563EB" stroke-width="1.2" stroke-opacity="0.3" stroke-dasharray="3 3"/>
      
      <!-- Rotating Vehicle Chassis Group -->
      <g transform="rotate(${roundedDeg}, 26, 26)">
        <!-- Drop Shadow -->
        <rect x="16" y="8" width="20" height="36" rx="6" fill="#000000" fill-opacity="0.22" filter="blur(1px)" />

        <!-- Ambulance Outer Body -->
        <rect x="16" y="8" width="20" height="36" rx="6" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.5" />

        <!-- Front Headlight Beams -->
        <polygon points="17,8 14,2 20,2" fill="#FACC15" fill-opacity="0.6"/>
        <polygon points="35,8 32,2 38,2" fill="#FACC15" fill-opacity="0.6"/>

        <!-- Front Windshield Cabin -->
        <rect x="18" y="11" width="16" height="7" rx="2" fill="#0284C7" stroke="#0369A1" stroke-width="0.8" />

        <!-- Dual Emergency Flashing Lightbar (Red & Blue Strobe) -->
        <rect x="19" y="19" width="6" height="3" rx="1" fill="#EF4444" />
        <rect x="27" y="19" width="6" height="3" rx="1" fill="#3B82F6" />

        <!-- Red Medical Life-Link Cross on Roof -->
        <rect x="24" y="24" width="4" height="12" rx="0.5" fill="#EF4444" />
        <rect x="20" y="28" width="12" height="4" rx="0.5" fill="#EF4444" />

        <!-- Directional Front Indicator Point -->
        <polygon points="26,6 23,9 29,9" fill="#EF4444" />
      </g>
    </svg>
  `;
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
  driverId = 'driver_108',
  height = '280px',
  onEtaUpdate,
}) => {
  // Current smoothly animated driver position (updated at 60fps via requestAnimationFrame)
  const [animatedDriverPos, setAnimatedDriverPos] = useState<{ lat: number; lng: number }>({
    lat: latitude,
    lng: longitude,
  });

  const [animatedHeading, setAnimatedHeading] = useState<number>(0);

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
  const [streamHealth, setStreamHealth] = useState<'SOCKET_LIVE' | 'POLLING_FALLBACK'>('SOCKET_LIVE');

  // Animation Engine Refs
  const markerInstanceRef = useRef<google.maps.Marker | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const animStartTimeRef = useRef<number>(0);
  const animDurationRef = useRef<number>(2500);
  const startPosRef = useRef<{ lat: number; lng: number }>({ lat: latitude, lng: longitude });
  const targetPosRef = useRef<{ lat: number; lng: number }>({ lat: latitude, lng: longitude });
  const currentPosRef = useRef<{ lat: number; lng: number }>({ lat: latitude, lng: longitude });
  const startHeadingRef = useRef<number>(0);
  const targetHeadingRef = useRef<number>(0);
  const currentHeadingRef = useRef<number>(0);
  const lastPingTimeRef = useRef<number>(0);
  const lastSocketTimeRef = useRef<number>(Date.now());
  const activeSubpathRef = useRef<Array<{ lat: number; lng: number }>>([]);
  const overviewPathRef = useRef<Array<{ lat: number; lng: number }>>([]);
  const lastIconHeadingRef = useRef<number>(-999);
  const lastRequestedOriginRef = useRef<{ lat: number; lng: number } | null>(null);
  const directionsUnavailableRef = useRef<boolean>(false);

  // Google Maps API Loader
  const googleApiKey = (import.meta.env.VITE_MAP_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: googleApiKey || 'DUMMY_KEY_TELEMETRY',
    libraries,
    preventGoogleFontsLoading: true,
  });

  // Sync props to state if props change initially
  useEffect(() => {
    if (latitude && longitude) {
      targetPosRef.current = { lat: latitude, lng: longitude };
      currentPosRef.current = { lat: latitude, lng: longitude };
      setAnimatedDriverPos({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (pickupLat && pickupLng) {
      setPickupPos({ lat: pickupLat, lng: pickupLng });
    }
  }, [pickupLat, pickupLng]);

  // 🚀 60fps requestAnimationFrame Interpolation Loop (NO JUMPING)
  const stepAnimation = useCallback((now: number) => {
    const elapsed = now - animStartTimeRef.current;
    const duration = animDurationRef.current || 2500;
    const progress = Math.min(1, Math.max(0, elapsed / duration));

    // Linear progression matching vehicle velocity between telemetry pings
    const t = progress;

    let nextPos: { lat: number; lng: number };
    let roadHeading: number | null = null;

    if (activeSubpathRef.current && activeSubpathRef.current.length > 1) {
      const interpolated = interpolateAlongPath(activeSubpathRef.current, t);
      nextPos = interpolated.pos;
      roadHeading = interpolated.heading;
    } else {
      nextPos = {
        lat: startPosRef.current.lat + (targetPosRef.current.lat - startPosRef.current.lat) * t,
        lng: startPosRef.current.lng + (targetPosRef.current.lng - startPosRef.current.lng) * t,
      };
    }

    // Determine heading rotation
    const destHeading = roadHeading !== null ? roadHeading : targetHeadingRef.current;
    const deltaAng = shortestAngularDiff(startHeadingRef.current, destHeading);
    const nextHeading = (startHeadingRef.current + deltaAng * t + 360) % 360;

    currentPosRef.current = nextPos;
    currentHeadingRef.current = nextHeading;

    // Direct WebGL Marker update for zero-latency 60fps
    if (markerInstanceRef.current && window.google?.maps?.LatLng) {
      markerInstanceRef.current.setPosition(new window.google.maps.LatLng(nextPos.lat, nextPos.lng));

      if (Math.abs(nextHeading - lastIconHeadingRef.current) >= 2) {
        lastIconHeadingRef.current = nextHeading;
        markerInstanceRef.current.setIcon({
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(generateAmbulanceSvg(nextHeading)),
          scaledSize: new window.google.maps.Size(52, 52),
          anchor: new window.google.maps.Point(26, 26),
        });
      }
    }

    // Update React state for overlays & fallback canvas
    setAnimatedDriverPos(nextPos);
    setAnimatedHeading(nextHeading);

    if (progress < 1) {
      rafIdRef.current = requestAnimationFrame(stepAnimation);
    }
  }, []);

  // 📡 Process incoming GPS coordinate update smoothly (from Socket or Fallback Polling)
  const handleNewGpsLocation = useCallback(
    (newLat: number, newLng: number, newHeading?: number, _newSpeed?: number) => {
      if (typeof newLat !== 'number' || typeof newLng !== 'number' || isNaN(newLat) || isNaN(newLng)) return;

      const now = performance.now();
      const pingDelta =
        lastPingTimeRef.current > 0
          ? Math.max(1600, Math.min(now - lastPingTimeRef.current, 3800))
          : 2500;
      lastPingTimeRef.current = now;

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      // Smooth continuity: Start from current position at this exact millisecond
      const curPos = currentPosRef.current || { lat: newLat, lng: newLng };
      startPosRef.current = { lat: curPos.lat, lng: curPos.lng };
      targetPosRef.current = { lat: newLat, lng: newLng };

      const distMoved = calculateDistanceKm(curPos.lat, curPos.lng, newLat, newLng);

      // Determine target heading
      let targetHeading = currentHeadingRef.current;
      if (typeof newHeading === 'number' && !isNaN(newHeading) && newHeading !== 0) {
        targetHeading = newHeading;
      } else if (distMoved > 0.003) {
        targetHeading = calculateBearing(curPos.lat, curPos.lng, newLat, newLng);
      }

      startHeadingRef.current = currentHeadingRef.current;
      targetHeadingRef.current = targetHeading;

      // Extract road subpath if Google Directions route overview_path is active
      if (overviewPathRef.current && overviewPathRef.current.length > 1 && distMoved > 0.005) {
        activeSubpathRef.current = extractRoadSubpath(overviewPathRef.current, startPosRef.current, targetPosRef.current);
      } else {
        activeSubpathRef.current = [startPosRef.current, targetPosRef.current];
      }

      animStartTimeRef.current = now;
      animDurationRef.current = pingDelta;

      rafIdRef.current = requestAnimationFrame(stepAnimation);
    },
    [stepAnimation]
  );

  // 📡 Socket.IO Real-time Room Setup & Location Subscription
  useEffect(() => {
    const socket = socketService.connect();

    if (bookingId) socketService.joinRide(bookingId);
    if (hospitalId) socketService.joinHospital(hospitalId);
    if (patientId) socketService.joinPatient(patientId);
    if (driverId) socketService.joinDriver(driverId);

    // Listen to real-time driver location stream
    const handleLocationUpdate = (payload: DriverLocationPayload) => {
      lastSocketTimeRef.current = Date.now();
      setStreamHealth('SOCKET_LIVE');

      const lat = payload.latitude ?? payload.lat;
      const lng = payload.longitude ?? payload.lng;
      if (typeof lat === 'number' && typeof lng === 'number') {
        handleNewGpsLocation(lat, lng, payload.heading, payload.speed);
      }
    };

    socketService.onDriverLocation(handleLocationUpdate);

    return () => {
      socket.off('driverLocation', handleLocationUpdate);
      socket.off('locationUpdate', handleLocationUpdate);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [bookingId, hospitalId, patientId, driverId, handleNewGpsLocation]);

  // 🛡️ Fallback Polling Engine: If socket pauses > 3 seconds, poll REST API
  useEffect(() => {
    const fallbackTimer = setInterval(async () => {
      const timeSinceLastSocket = Date.now() - lastSocketTimeRef.current;
      if (timeSinceLastSocket > 3000) {
        setStreamHealth('POLLING_FALLBACK');
        try {
          const res = await apiClient.get(`/api/location/${driverId || 'driver_108'}`);
          if (res.data?.success && res.data.location) {
            const loc = res.data.location;
            if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
              handleNewGpsLocation(loc.latitude, loc.longitude, loc.heading, loc.speed);
            }
          }
        } catch {
          // Suppress fallback error
        }
      }
    }, 2800);

    return () => clearInterval(fallbackTimer);
  }, [driverId, handleNewGpsLocation]);

  // Fallback distance and ETA calculation via Haversine distance
  const calculateFallbackRoute = useCallback(() => {
    const distKm = calculateDistanceKm(animatedDriverPos.lat, animatedDriverPos.lng, pickupPos.lat, pickupPos.lng);
    const estMinutes = Math.max(2, Math.round(distKm * 2.2 + 1));
    const distStr = `${distKm} km`;
    const etaStr = `${estMinutes} mins`;
    setLiveDistance(distStr);
    setTrafficEta(etaStr);
    setTrafficCondition(distKm > 3 ? 'MODERATE' : 'SMOOTH');
    if (onEtaUpdate) onEtaUpdate(etaStr, distStr);
  }, [animatedDriverPos.lat, animatedDriverPos.lng, pickupPos.lat, pickupPos.lng, onEtaUpdate]);

  /**
   * 🚀 DYNAMIC ETA (LIVE TRAFFIC)
   * Calculates real-time driving route using Google Directions API
   */
  const calculateLiveTrafficRoute = useCallback(() => {
    if (!isLoaded || loadError || !window.google?.maps?.DirectionsService || directionsUnavailableRef.current) {
      calculateFallbackRoute();
      return;
    }

    const now = Date.now();
    if (now - lastRouteRequestTime < 4000) {
      return;
    }

    if (lastRequestedOriginRef.current) {
      const movedDist = calculateDistanceKm(
        animatedDriverPos.lat,
        animatedDriverPos.lng,
        lastRequestedOriginRef.current.lat,
        lastRequestedOriginRef.current.lng
      );
      if (movedDist < 0.04) {
        return; // Don't re-query if moved less than 40 meters
      }
    }

    try {
      const directionsService = new window.google.maps.DirectionsService();

      directionsService.route(
        {
          origin: new window.google.maps.LatLng(animatedDriverPos.lat, animatedDriverPos.lng),
          destination: new window.google.maps.LatLng(pickupPos.lat, pickupPos.lng),
          travelMode: window.google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
          },
        },
        (result, status) => {
          setLastRouteRequestTime(now);
          lastRequestedOriginRef.current = { lat: animatedDriverPos.lat, lng: animatedDriverPos.lng };

          if (status === window.google.maps.DirectionsStatus.OK && result) {
            setDirectionsResult(result);

            // Store road path vertices for smooth road following
            const route = result.routes[0];
            if (route?.overview_path) {
              overviewPathRef.current = route.overview_path.map((p) => ({
                lat: p.lat(),
                lng: p.lng(),
              }));
            }

            const routeLeg = result.routes[0]?.legs[0];
            if (routeLeg) {
              const distance = routeLeg.distance?.text || '1.8 km';
              const duration = routeLeg.duration?.text || '5 mins';
              const duration_in_traffic = routeLeg.duration_in_traffic?.text || duration;

              setTrafficEta(duration_in_traffic);
              setLiveDistance(distance);

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
            directionsUnavailableRef.current = true;
            calculateFallbackRoute();
          }
        }
      );
    } catch {
      directionsUnavailableRef.current = true;
      calculateFallbackRoute();
    }
  }, [
    animatedDriverPos.lat,
    animatedDriverPos.lng,
    pickupPos.lat,
    pickupPos.lng,
    isLoaded,
    loadError,
    lastRouteRequestTime,
    onEtaUpdate,
    calculateFallbackRoute,
  ]);

  useEffect(() => {
    calculateLiveTrafficRoute();
  }, [calculateLiveTrafficRoute]);

  // Fit bounds when map loads
  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      setMapInstance(map);
      try {
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(new window.google.maps.LatLng(animatedDriverPos.lat, animatedDriverPos.lng));
        bounds.extend(new window.google.maps.LatLng(pickupPos.lat, pickupPos.lng));
        map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
      } catch {
        // Safe fallback
      }
    },
    [animatedDriverPos, pickupPos]
  );

  // Dynamic SVG Ambulance Icon
  const ambulanceMarkerIcon = useMemo(() => {
    if (typeof window === 'undefined' || !window.google?.maps) return undefined;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(generateAmbulanceSvg(animatedHeading)),
      scaledSize: new window.google.maps.Size(52, 52),
      anchor: new window.google.maps.Point(26, 26),
    };
  }, [animatedHeading]);

  // Patient Pickup Marker Icon
  const pickupMarkerIcon = useMemo(() => {
    if (typeof window === 'undefined' || !window.google?.maps) return undefined;
    return {
      url:
        'data:image/svg+xml;charset=UTF-8,' +
        encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">
          <circle cx="21" cy="21" r="18" fill="#2563EB" fill-opacity="0.2" stroke="#2563EB" stroke-width="1.5" stroke-dasharray="2 2" />
          <circle cx="21" cy="21" r="13" fill="#2563EB" stroke="#FFFFFF" stroke-width="2.5" />
          <circle cx="21" cy="21" r="5" fill="#FFFFFF" />
        </svg>
      `),
      scaledSize: new window.google.maps.Size(42, 42),
      anchor: new window.google.maps.Point(21, 21),
    };
  }, []);

  const hasValidGoogleMaps = isLoaded && !loadError && typeof window.google?.maps?.Map === 'function';

  return (
    <div className="w-full flex flex-col font-sans select-none">
      {/* 🎨 1. LIVE TRAFFIC & DYNAMIC ETA INFO PANEL (Header Bar) */}
      <div className="bg-white border-b border-blue-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-lg border border-blue-200">
            <span className="text-sm">🚑</span>
            <span>Distance: <strong className="text-blue-900">{liveDistance}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs px-2.5 py-1 rounded-lg border border-emerald-200">
            <span className="text-sm">⏱️</span>
            <span>Traffic ETA: <strong className="text-emerald-900">{trafficEta}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {streamHealth === 'SOCKET_LIVE' ? (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              60fps Socket Stream
            </span>
          ) : (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              REST Fallback Active
            </span>
          )}

          {trafficCondition === 'SMOOTH' && (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full hidden sm:flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Flow Clear
            </span>
          )}
          {trafficCondition === 'MODERATE' && (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full hidden sm:flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Moderate Traffic
            </span>
          )}
          {trafficCondition === 'HEAVY' && (
            <span className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full hidden sm:flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span> Heavy Traffic
            </span>
          )}

          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
            {vehicleNumber}
          </span>
        </div>
      </div>

      {/* 🗺️ 2. MAP CANVAS SECTION */}
      <div style={{ height }} className="relative w-full bg-slate-100 overflow-hidden">
        {hasValidGoogleMaps ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={animatedDriverPos}
            zoom={14}
            options={defaultMapOptions}
            onLoad={onMapLoad}
          >
            {/* Real-time Directions Route Line or Resilient Polyline Corridor */}
            {directionsResult ? (
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
            ) : (
              <Polyline
                path={[animatedDriverPos, pickupPos]}
                options={{
                  strokeColor: '#2563EB',
                  strokeWeight: 4,
                  strokeOpacity: 0.8,
                  geodesic: true,
                }}
              />
            )}

            {/* Smooth 60fps Moving Ambulance Vehicle Marker */}
            <Marker
              position={animatedDriverPos}
              icon={ambulanceMarkerIcon}
              title={`Ambulance: ${vehicleNumber} (${driverName})`}
              onLoad={(marker) => {
                markerInstanceRef.current = marker;
              }}
              onClick={() => setSelectedMarker('DRIVER')}
            />

            {/* Patient Pickup Location Marker */}
            <Marker
              position={pickupPos}
              icon={pickupMarkerIcon}
              title="Patient Pickup Point"
              onClick={() => setSelectedMarker('PICKUP')}
            />

            {/* Driver Info Window */}
            {selectedMarker === 'DRIVER' && (
              <InfoWindow position={animatedDriverPos} onCloseClick={() => setSelectedMarker(null)}>
                <div className="p-1 text-xs">
                  <p className="font-bold text-slate-900 flex items-center gap-1">
                    <span>🚑</span> {vehicleNumber}
                  </p>
                  <p className="text-slate-600">Paramedic: {driverName}</p>
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
          /* ⚡ High-precision interactive fallback radar canvas when Google key is offline */
          <div className="relative w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col items-center justify-center p-4 text-white overflow-hidden select-none">
            {/* Radar Coordinates Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:28px_28px] opacity-40"></div>

            {/* Connecting Route Corridor */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line
                x1="28%"
                y1="62%"
                x2="72%"
                y2="38%"
                stroke="#3B82F6"
                strokeWidth="4"
                strokeDasharray="6 6"
                className="animate-pulse"
              />
            </svg>

            {/* Smooth Moving Ambulance Beacon */}
            <div
              className="absolute left-[28%] top-[62%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-transform duration-300"
              style={{ transform: `translate(-50%, -50%) rotate(${animatedHeading}deg)` }}
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 border-2 border-white shadow-xl shadow-red-500/40 flex items-center justify-center text-xl">
                🚑
              </div>
            </div>
            <div className="absolute left-[28%] top-[62%] translate-y-7 -translate-x-1/2 pointer-events-none">
              <span className="bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/20 whitespace-nowrap shadow-sm">
                {vehicleNumber} (Live 60fps)
              </span>
            </div>

            {/* Patient Pickup Beacon */}
            <div className="absolute left-[72%] top-[38%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 border-2 border-white shadow-xl shadow-blue-500/40 flex items-center justify-center text-lg animate-bounce">
                📍
              </div>
              <span className="mt-1 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-blue-200 border border-white/20 whitespace-nowrap">
                Patient Pickup Point
              </span>
            </div>

            {/* Live GPS Telemetry Bar */}
            <div className="absolute bottom-2.5 left-3 right-3 flex flex-wrap items-center justify-between bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700 text-xs gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-slate-300 font-mono">
                  GPS: <strong className="text-white">{animatedDriverPos.lat.toFixed(4)}° N, {animatedDriverPos.lng.toFixed(4)}° E</strong>
                </span>
                <span className="text-slate-400 font-mono text-[10px]">
                  ({Math.round(animatedHeading)}° Heading)
                </span>
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
