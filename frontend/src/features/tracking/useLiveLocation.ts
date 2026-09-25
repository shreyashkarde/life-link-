import { useState, useEffect, useRef, useCallback } from 'react';
import socketService, { DriverLocationPayload } from '../../services/socket';
import apiClient from '../../services/apiClient';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  lat?: number;
  lng?: number;
  address?: string;
  heading?: number;
  speed?: number;
  accuracy?: number;
  updatedAt?: Date;
}

export interface UseLiveLocationProps {
  userId?: string;
  role?: 'patient' | 'driver' | 'admin';
  bookingId?: string;
  patientId?: string;
  driverId?: string;
  hospitalId?: string;
  autoWatchGps?: boolean;
}

export interface UseLiveLocationReturn {
  currentLocation: LocationCoordinates | null;
  pickupLocation: LocationCoordinates | null;
  trackingStatus: string;
  etaMinutes: number | null;
  distanceKm: number | null;
  lastUpdated: Date | null;
  isBroadcasting: boolean;
  gpsAccuracy: number | null;
  pingsSent: number;
  gpsError: string | null;
  updateLocation: (coords: { latitude: number; longitude: number; heading?: number; speed?: number; accuracy?: number }) => Promise<void>;
  startBroadcasting: () => void;
  stopBroadcasting: () => void;
}

// Haversine formula distance calculation in km
export const calculateHaversine = (lat1: number, lon1: number, lat2: number, lon2: number): number | null => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

// Compute dynamic bearing/heading angle (0–360°) between two coordinates
export const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (Math.round((θ * 180) / Math.PI) + 360) % 360;
};

export const useLiveLocation = ({
  userId,
  role = 'patient',
  bookingId,
  patientId,
  driverId,
  hospitalId = 'hosp_lilavati',
  autoWatchGps = false,
}: UseLiveLocationProps = {}): UseLiveLocationReturn => {
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
  const [pickupLocation, setPickupLocation] = useState<LocationCoordinates | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<string>('CONNECTING');
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [pingsSent, setPingsSent] = useState<number>(0);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentTimeRef = useRef<number>(0);
  const lastCoordsRef = useRef<{ lat: number; lng: number; heading: number } | null>(null);

  // Helper to send live location updates to backend and socket (throttled every 2-3s)
  const updateLocation = useCallback(
    async (coords: { latitude: number; longitude: number; heading?: number; speed?: number; accuracy?: number }) => {
      if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') return;

      const effectiveDriverId = driverId || userId || 'driver_108';
      const heading = typeof coords.heading === 'number' && !isNaN(coords.heading) ? coords.heading : 0;
      const speed = typeof coords.speed === 'number' && !isNaN(coords.speed) ? coords.speed : 0;

      const payload: DriverLocationPayload = {
        userId: userId || effectiveDriverId,
        driverId: effectiveDriverId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        lat: coords.latitude,
        lng: coords.longitude,
        heading,
        speed,
        bookingId,
        patientId,
        hospitalId,
        timestamp: new Date().toISOString(),
      };

      const now = new Date();
      setCurrentLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        lat: coords.latitude,
        lng: coords.longitude,
        heading,
        speed,
        accuracy: coords.accuracy,
        updatedAt: now,
      });
      setLastUpdated(now);
      if (coords.accuracy !== undefined) {
        setGpsAccuracy(coords.accuracy);
      }
      setPingsSent((prev) => prev + 1);

      // 1. Emit via WebSocket with low latency
      socketService.emitDriverLocation(payload);

      // 2. Persist via REST API (non-blocking)
      try {
        await apiClient.post('/api/location/update', {
          ...payload,
          role: 'driver',
        });
      } catch {
        // Suppress non-critical REST errors during real-time GPS stream
      }
    },
    [userId, bookingId, patientId, driverId, hospitalId]
  );

  // 📡 Start Hardware Geolocation Broadcaster (watchPosition)
  const startBroadcasting = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation API not supported by browser/device');
      return;
    }

    setGpsError(null);
    setIsBroadcasting(true);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        const currentLat = pos.coords.latitude;
        const currentLng = pos.coords.longitude;
        const currentAccuracy = pos.coords.accuracy;

        // Compute bearing if heading is null/NaN or 0
        let heading = pos.coords.heading;
        if (heading === null || isNaN(heading) || heading === 0) {
          if (lastCoordsRef.current) {
            const dist = calculateHaversine(
              lastCoordsRef.current.lat,
              lastCoordsRef.current.lng,
              currentLat,
              currentLng
            );
            if (dist && dist > 0.003) {
              heading = calculateBearing(
                lastCoordsRef.current.lat,
                lastCoordsRef.current.lng,
                currentLat,
                currentLng
              );
            } else {
              heading = lastCoordsRef.current.heading;
            }
          } else {
            heading = 0;
          }
        }

        const speedKmh = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;

        // Throttle updates: send every 2 to 3 seconds (2200ms)
        if (now - lastSentTimeRef.current >= 2200) {
          lastSentTimeRef.current = now;
          lastCoordsRef.current = { lat: currentLat, lng: currentLng, heading: heading || 0 };

          updateLocation({
            latitude: currentLat,
            longitude: currentLng,
            heading: heading || 0,
            speed: speedKmh,
            accuracy: Math.round(currentAccuracy * 10) / 10,
          });
        }
      },
      (err) => {
        console.warn('⚠️ [Geolocation Error]', err.message);
        setGpsError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0, // Never use stale cached GPS fixes
      }
    );

    // 💓 2.5s Heartbeat interval: if stationary and watchPosition is quiet, keep heartbeat active
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastSentTimeRef.current >= 2500 && lastCoordsRef.current) {
        lastSentTimeRef.current = now;
        updateLocation({
          latitude: lastCoordsRef.current.lat,
          longitude: lastCoordsRef.current.lng,
          heading: lastCoordsRef.current.heading,
          speed: 0,
          accuracy: 5,
        });
      }
    }, 2500);
  }, [updateLocation]);

  const stopBroadcasting = useCallback(() => {
    setIsBroadcasting(false);
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Socket setup & room subscription
  useEffect(() => {
    const socket = socketService.connect();

    // 1. Join rooms based on role & identifiers
    if (bookingId) {
      socketService.joinRide(bookingId);
    }
    if (patientId) {
      socketService.joinPatient(patientId);
    }
    if (hospitalId) {
      socketService.joinHospital(hospitalId);
    }
    if (driverId) {
      socketService.joinDriver(driverId);
      socket.emit('driverConnected', { driverId, hospitalId });
    }

    // 2. Initial fetch & 2.8-second fallback polling from dynamic API
    const targetUser = role === 'patient' ? driverId || 'driver_108' : userId || driverId || 'driver_108';
    const pollLocationFromAPI = async () => {
      try {
        const res = await apiClient.get(`/api/location/${targetUser}`);
        if (res.data?.success && res.data.location) {
          const loc = res.data.location;
          setCurrentLocation((prev) => {
            const apiUpdated = loc.updatedAt ? new Date(loc.updatedAt).getTime() : Date.now();
            const prevUpdated = prev?.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
            if (apiUpdated >= prevUpdated || !prev) {
              return {
                latitude: loc.latitude,
                longitude: loc.longitude,
                lat: loc.latitude,
                lng: loc.longitude,
                heading: loc.heading || 0,
                speed: loc.speed || 0,
                updatedAt: new Date(loc.updatedAt || Date.now()),
              };
            }
            return prev;
          });
          setTrackingStatus((prev) => (prev === 'LIVE_STREAMING' ? prev : 'TRACKING_ACTIVE'));
        }
      } catch {
        // Fallback polling error caught silently
      }
    };

    pollLocationFromAPI();
    const fallbackPollInterval = setInterval(pollLocationFromAPI, 2800);

    // Fetch trip pickup if bookingId provided
    if (bookingId) {
      apiClient.get(`/api/location/trip/${bookingId}`)
        .then((res) => {
          if (res.data?.success && res.data.pickup) {
            setPickupLocation(res.data.pickup);
          }
        })
        .catch(() => {});
    }

    // 3. Listen for live `driverLocation` & `locationUpdate`
    const handleLocationIncoming = (data: DriverLocationPayload) => {
      const lat = data.latitude ?? data.lat;
      const lng = data.longitude ?? data.lng;
      if (typeof lat === 'number' && typeof lng === 'number') {
        setCurrentLocation({
          latitude: lat,
          longitude: lng,
          lat,
          lng,
          heading: data.heading || 0,
          speed: data.speed || 0,
          updatedAt: new Date(),
        });
        setLastUpdated(new Date());
        setTrackingStatus('LIVE_STREAMING');
      }
    };

    socketService.onDriverLocation(handleLocationIncoming);

    // 4. Auto-watch GPS if configured for driver
    if (autoWatchGps && role === 'driver') {
      startBroadcasting();
    }

    return () => {
      clearInterval(fallbackPollInterval);
      stopBroadcasting();
    };
  }, [bookingId, patientId, driverId, hospitalId, role, autoWatchGps, startBroadcasting, stopBroadcasting, userId]);

  // Recalculate ETA and Distance dynamically when coordinates update
  useEffect(() => {
    if (currentLocation && pickupLocation) {
      const dist = calculateHaversine(
        currentLocation.latitude,
        currentLocation.longitude,
        pickupLocation.latitude,
        pickupLocation.longitude
      );
      if (dist !== null) {
        setDistanceKm(dist);
        const minutes = Math.max(1, Math.round((dist / 35) * 60));
        setEtaMinutes(minutes);
      }
    }
  }, [currentLocation, pickupLocation]);

  return {
    currentLocation,
    pickupLocation,
    trackingStatus,
    etaMinutes,
    distanceKm,
    lastUpdated,
    isBroadcasting,
    gpsAccuracy,
    pingsSent,
    gpsError,
    updateLocation,
    startBroadcasting,
    stopBroadcasting,
  };
};

export default useLiveLocation;
