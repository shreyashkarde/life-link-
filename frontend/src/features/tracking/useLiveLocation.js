import { useState, useEffect, useRef, useCallback } from 'react';
import socketClient from '../realtime/socketClient';

/**
 * 📍 useLiveLocation.js
 * Custom React Hook for Real-Time Dynamic Location & Ambulance Tracking
 * - Connects strictly to room-based channels: `ride_${bookingId}`, `patient_${patientId}`, `driver_${driverId}`
 * - Listens for real-time `locationUpdate`, `driverConnected`, `trackingStart`
 * - Streams GPS updates to backend without manual page refreshes
 * - Calculates dynamic distance and ETA based on coordinates
 */
export const useLiveLocation = ({
  userId,
  role = 'patient', // 'patient' | 'driver'
  bookingId = null,
  patientId = null,
  driverId = null,
  autoWatchGps = false,
} = {}) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState('CONNECTING');
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const watchIdRef = useRef(null);

  // Haversine formula distance calculation
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  // Helper to send live location updates to backend and socket
  const updateLocation = useCallback(
    async (coords) => {
      if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') return;

      const payload = {
        userId: userId || driverId || 'driver_108',
        role,
        latitude: coords.latitude,
        longitude: coords.longitude,
        heading: coords.heading || 0,
        speed: coords.speed || 0,
        bookingId,
        patientId,
      };

      setCurrentLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        heading: coords.heading || 0,
        speed: coords.speed || 0,
        updatedAt: new Date(),
      });
      setLastUpdated(new Date());

      // 1. Emit via WebSocket
      socketClient.emit('locationUpdate', payload);

      // 2. Persist via REST API
      try {
        await fetch('http://localhost:5000/api/location/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        // Non-blocking telemetry
      }
    },
    [userId, role, bookingId, patientId, driverId]
  );

  // Socket setup & room subscription
  useEffect(() => {
    const socket = socketClient.getSocket();

    // 1. Join room based on role & identifiers
    if (bookingId) {
      socketClient.joinRoom(`ride_${bookingId}`);
    }
    if (patientId) {
      socketClient.joinRoom(`patient_${patientId}`);
    }
    if (driverId) {
      socketClient.joinRoom(`driver_${driverId}`);
      socket.emit('driverConnected', { driverId });
    }

    // 2. Initial fetch from dynamic API
    const targetUser = role === 'patient' ? driverId || 'driver_108' : userId || driverId || 'driver_108';
    fetch(`http://localhost:5000/api/location/${targetUser}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.location) {
          setCurrentLocation({
            latitude: res.location.latitude,
            longitude: res.location.longitude,
            heading: res.location.heading || 0,
            speed: res.location.speed || 0,
            updatedAt: new Date(res.location.updatedAt),
          });
          setTrackingStatus('TRACKING_ACTIVE');
        }
      })
      .catch(() => {});

    // Fetch trip pickup if bookingId provided
    if (bookingId) {
      fetch(`http://localhost:5000/api/location/trip/${bookingId}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.pickup) {
            setPickupLocation(res.pickup);
          }
        })
        .catch(() => {});
    }

    // 3. Listen for live `locationUpdate`
    const unsubLocation = socketClient.on('locationUpdate', (data) => {
      const lat = data.latitude ?? data.lat;
      const lng = data.longitude ?? data.lng;
      if (typeof lat === 'number' && typeof lng === 'number') {
        setCurrentLocation({
          latitude: lat,
          longitude: lng,
          heading: data.heading || 0,
          speed: data.speed || 0,
          updatedAt: new Date(),
        });
        setLastUpdated(new Date());
        setTrackingStatus('LIVE_STREAMING');
      }
    });

    const unsubDriverConnected = socketClient.on('driverStatus', () => {
      setTrackingStatus('DRIVER_ONLINE');
    });

    // 4. Driver auto-watch GPS option
    if (autoWatchGps && navigator.geolocation && role === 'driver') {
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
      unsubLocation();
      unsubDriverConnected();
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [bookingId, patientId, driverId, role, autoWatchGps, updateLocation, userId]);

  // Recalculate ETA and Distance dynamically when coordinates update
  useEffect(() => {
    if (currentLocation && pickupLocation) {
      const dist = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        pickupLocation.latitude,
        pickupLocation.longitude
      );
      if (dist !== null) {
        setDistanceKm(dist);
        // Estimate ETA assuming average urban ambulance transit speed ~30 km/h with siren
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
