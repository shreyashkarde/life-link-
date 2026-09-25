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
  updateLocation: (coords: { latitude: number; longitude: number; heading?: number; speed?: number }) => Promise<void>;
}

// Haversine formula distance calculation
const calculateHaversine = (lat1: number, lon1: number, lat2: number, lon2: number): number | null => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
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
  const watchIdRef = useRef<number | null>(null);

  // Helper to send live location updates to backend and socket
  const updateLocation = useCallback(
    async (coords: { latitude: number; longitude: number; heading?: number; speed?: number }) => {
      if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') return;

      const payload: DriverLocationPayload = {
        userId: userId || driverId || 'driver_108',
        driverId: driverId || 'driver_108',
        latitude: coords.latitude,
        longitude: coords.longitude,
        lat: coords.latitude,
        lng: coords.longitude,
        heading: coords.heading || 0,
        speed: coords.speed || 0,
        bookingId,
        patientId,
        hospitalId,
        timestamp: new Date().toISOString(),
      };

      setCurrentLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        lat: coords.latitude,
        lng: coords.longitude,
        heading: coords.heading || 0,
        speed: coords.speed || 0,
        updatedAt: new Date(),
      });
      setLastUpdated(new Date());

      // 1. Emit via WebSocket
      socketService.emitDriverLocation(payload);

      // 2. Persist via REST API
      try {
        await apiClient.post('/api/location/update', payload);
      } catch (err) {
        // Non-blocking telemetry
      }
    },
    [userId, bookingId, patientId, driverId, hospitalId]
  );

  // Socket setup & room subscription
  useEffect(() => {
    const socket = socketService.connect();

    // 1. Join room based on role & identifiers
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

    // 2. Initial fetch & 5-second fallback polling from dynamic API
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
      } catch (err) {
        // Fallback polling error caught silently
      }
    };

    pollLocationFromAPI();
    const fallbackPollInterval = setInterval(pollLocationFromAPI, 5000);

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

    // 4. Driver auto-watch GPS option
    if (autoWatchGps && typeof navigator !== 'undefined' && navigator.geolocation && role === 'driver') {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          updateLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            heading: pos.coords.heading || 0,
            speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
    }

    return () => {
      clearInterval(fallbackPollInterval);
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [bookingId, patientId, driverId, hospitalId, role, autoWatchGps, updateLocation, userId]);

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
        const minutes = Math.max(1, Math.round((dist / 30) * 60));
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
    updateLocation,
  };
};

export default useLiveLocation;
