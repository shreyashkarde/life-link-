import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Navigation,
  Compass,
  Gauge,
  Play,
  Square,
  RefreshCw,
  MapPin,
  Clock,
  ShieldCheck,
  Radio,
  Sparkles,
  Phone,
  Maximize2,
} from 'lucide-react';
import socketService from '../../services/socket';
import apiClient from '../../services/apiClient';

export interface DriverCoords {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

export interface UberDriverLiveMapProps {
  bookingId?: string;
  orderId?: string;
  pickupLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
  destinationLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
  initialDriverLocation?: {
    lat: number;
    lng: number;
  };
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  className?: string;
  height?: string | number;
}

// Haversine distance in km
const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

// Gyroscopic Dynamic Bearing Angle Calculation (0° - 360°)
const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (Math.round((θ * 180) / Math.PI) + 360) % 360;
};

// Realistic Waypoints for GPS Simulation Demo (Bandra to Lilavati / Mumbai Trauma Corridor)
const SIMULATION_WAYPOINTS: DriverCoords[] = [
  { lat: 19.0596, lng: 72.8290, speed: 42, heading: 175 },
  { lat: 19.0578, lng: 72.8292, speed: 45, heading: 178 },
  { lat: 19.0555, lng: 72.8294, speed: 48, heading: 180 },
  { lat: 19.0540, lng: 72.8295, speed: 38, heading: 182 },
  { lat: 19.0522, lng: 72.8295, speed: 20, heading: 185 }, // Arrived at Hospital
  { lat: 19.0505, lng: 72.8310, speed: 40, heading: 135 },
  { lat: 19.0480, lng: 72.8335, speed: 52, heading: 140 },
  { lat: 19.0450, lng: 72.8350, speed: 55, heading: 145 },
  { lat: 19.0420, lng: 72.8370, speed: 50, heading: 150 },
  { lat: 19.0380, lng: 72.8385, speed: 46, heading: 160 },
  { lat: 19.0330, lng: 72.8397, speed: 25, heading: 170 }, // Hinduja Hospital
];

export const UberDriverLiveMap: React.FC<UberDriverLiveMapProps> = ({
  bookingId,
  orderId,
  pickupLocation = { lat: 19.0600, lng: 72.8300, address: 'Patient Pickup Point, Linking Rd' },
  destinationLocation = { lat: 19.0522, lng: 72.8295, address: 'Lilavati Apex Emergency Hospital' },
  initialDriverLocation = { lat: 19.0596, lng: 72.8290 },
  driverName = 'Rajesh Kumar',
  driverPhone = '+91 98201 55432',
  vehicleNumber = 'MH-02-EM-9911',
  className = '',
  height = '520px',
}) => {
  // Target location received from socket/telemetry
  const targetLocationRef = useRef<DriverCoords>({
    lat: initialDriverLocation.lat,
    lng: initialDriverLocation.lng,
    heading: 180,
    speed: 40,
  });

  // Animated visual location rendered at 60fps
  const [currentCarCoords, setCurrentCarCoords] = useState<DriverCoords>({
    lat: initialDriverLocation.lat,
    lng: initialDriverLocation.lng,
    heading: 180,
    speed: 0,
  });

  const [cameraHeading, setCameraHeading] = useState<number>(180);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isSocketLive, setIsSocketLive] = useState<boolean>(true);
  const [distanceRemainingKm, setDistanceRemainingKm] = useState<number>(0);
  const [etaMinutes, setEtaMinutes] = useState<number>(3);
  const [cameraFollowEnabled, setCameraFollowEnabled] = useState<boolean>(true);

  const animFrameIdRef = useRef<number | null>(null);
  const simIndexRef = useRef<number>(0);
  const simIntervalRef = useRef<any>(null);

  // 1. Smooth 60fps Lerp Interpolation Engine (Zero Jumping)
  useEffect(() => {
    let active = true;

    const animateMovement = () => {
      if (!active) return;

      setCurrentCarCoords((prev) => {
        const target = targetLocationRef.current;
        const lerpFactor = 0.08; // 60fps smooth easing

        const dLat = target.lat - prev.lat;
        const dLng = target.lng - prev.lng;

        // If very close, snap to target
        if (Math.abs(dLat) < 0.000005 && Math.abs(dLng) < 0.000005) {
          return {
            ...prev,
            lat: target.lat,
            lng: target.lng,
            heading: target.heading ?? prev.heading,
            speed: target.speed ?? prev.speed,
          };
        }

        const newLat = prev.lat + dLat * lerpFactor;
        const newLng = prev.lng + dLng * lerpFactor;

        // Dynamic bearing angle calculation
        const calculatedAngle = calculateBearing(prev.lat, prev.lng, target.lat, target.lng);
        const headingLerp = target.heading !== undefined ? target.heading : calculatedAngle;

        return {
          lat: newLat,
          lng: newLng,
          heading: headingLerp,
          speed: target.speed ?? prev.speed,
        };
      });

      animFrameIdRef.current = requestAnimationFrame(animateMovement);
    };

    animFrameIdRef.current = requestAnimationFrame(animateMovement);

    return () => {
      active = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  // 2. Camera Follow & Heading Update (Gyroscopic Effect)
  useEffect(() => {
    if (cameraFollowEnabled) {
      setCameraHeading(currentCarCoords.heading || 0);
    }
  }, [currentCarCoords, cameraFollowEnabled]);

  // 3. Compute Distance & ETA
  useEffect(() => {
    const dist = calculateDistanceKm(
      currentCarCoords.lat,
      currentCarCoords.lng,
      destinationLocation.lat,
      destinationLocation.lng
    );
    setDistanceRemainingKm(dist);
    setEtaMinutes(Math.max(1, Math.round(dist * 2.2)));
  }, [currentCarCoords, destinationLocation]);

  // 4. Socket.IO Live Telemetry Listener
  useEffect(() => {
    const activeRideId = bookingId || orderId;
    if (activeRideId) {
      socketService.joinRoom(`ride_${activeRideId}`);
    }

    const unsubLocation = socketService.onLocationUpdate((payload) => {
      setIsSocketLive(true);
      if (payload.lat && payload.lng) {
        targetLocationRef.current = {
          lat: payload.lat,
          lng: payload.lng,
          heading: payload.heading,
          speed: payload.speed || 45,
        };
      }
    });

    // 5. Polling Fallback if socket fails (Every 5 seconds)
    const pollTimer = setInterval(async () => {
      if (!activeRideId) return;
      try {
        const res = await apiClient.get(`/api/bookings/${activeRideId}`);
        if (res.data?.booking?.driverLocation) {
          const loc = res.data.booking.driverLocation;
          targetLocationRef.current = {
            lat: loc.lat || loc.latitude,
            lng: loc.lng || loc.longitude,
            heading: loc.heading,
            speed: loc.speed || 40,
          };
        }
      } catch {
        // Silently continue
      }
    }, 5000);

    return () => {
      if (activeRideId) socketService.leaveRoom(`ride_${activeRideId}`);
      if (typeof unsubLocation === 'function') unsubLocation();
      clearInterval(pollTimer);
    };
  }, [bookingId, orderId]);

  // 6. Test Simulation Mode (Multi-Waypoint Animation)
  const toggleSimulation = () => {
    if (isSimulating) {
      clearInterval(simIntervalRef.current);
      setIsSimulating(false);
    } else {
      setIsSimulating(true);
      simIndexRef.current = 0;

      simIntervalRef.current = setInterval(() => {
        simIndexRef.current = (simIndexRef.current + 1) % SIMULATION_WAYPOINTS.length;
        const nextPt = SIMULATION_WAYPOINTS[simIndexRef.current];
        targetLocationRef.current = { ...nextPt };
      }, 2000);
    }
  };

  return (
    <div
      style={{ height }}
      className={`relative w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 flex flex-col ${className}`}
    >
      {/* 🧭 Top Telemetry & Controls HUD */}
      <div className="absolute top-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Driver Telemetry Badge */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/80 shadow-2xl flex items-center gap-3 text-white">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white">{vehicleNumber}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded">
                Uber Live Engine
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-300 font-semibold mt-0.5">
              <span className="flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-blue-400" />
                {currentCarCoords.speed || 42} km/h
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                {Math.round(currentCarCoords.heading || 0)}° Bearing
              </span>
            </div>
          </div>
        </div>

        {/* Simulation & Camera Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={toggleSimulation}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg border ${
              isSimulating
                ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white'
            }`}
          >
            {isSimulating ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulating ? 'Stop GPS Simulation' : 'Start GPS Simulation'}</span>
          </button>

          <button
            onClick={() => setCameraFollowEnabled(!cameraFollowEnabled)}
            className={`p-2 rounded-xl text-xs font-semibold transition border backdrop-blur-md ${
              cameraFollowEnabled
                ? 'bg-blue-600 text-white border-blue-400'
                : 'bg-slate-900/80 text-slate-300 border-slate-700'
            }`}
            title="Toggle Uber Gyro Camera-Follow"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 🗺️ 3D Perspective Vector Map Canvas (Tilt: 45°, Dynamic Heading Camera) */}
      <div className="relative w-full h-full flex-1 overflow-hidden bg-slate-950 flex items-center justify-center">
        {/* Animated Map Container with 3D Perspective Transformation */}
        <div
          style={{
            transform: cameraFollowEnabled
              ? `perspective(800px) rotateX(40deg) rotateZ(${-cameraHeading + 180}deg)`
              : 'perspective(800px) rotateX(25deg)',
            transformOrigin: '50% 50%',
            transition: 'transform 0.4s ease-out',
          }}
          className="relative w-[140%] h-[140%] -m-[20%]"
        >
          {/* Dark Modern High-Contrast City Grid */}
          <svg className="w-full h-full absolute inset-0 opacity-50" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="uber-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1e293b" strokeWidth="1.2" />
              </pattern>
              <linearGradient id="uberRouteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="50%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#uber-grid)" />

            {/* Glowing Expressway Road Corridor */}
            <path
              d="M 20% 30% Q 50% 50% 80% 70%"
              fill="none"
              stroke="#0f172a"
              strokeWidth="28"
              strokeLinecap="round"
            />
            <path
              d="M 20% 30% Q 50% 50% 80% 70%"
              fill="none"
              stroke="url(#uberRouteGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="12 8"
              className="animate-pulse"
            />
          </svg>

          {/* 📍 Destination Marker (Lilavati Hospital / Trauma Center) */}
          <div
            style={{ left: '76%', top: '68%' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center"
          >
            <div className="p-2.5 bg-emerald-600 rounded-full text-white shadow-2xl border-2 border-white ring-4 ring-emerald-500/30 animate-bounce">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="mt-1 px-2.5 py-0.5 bg-slate-900/90 text-emerald-300 text-[10px] font-bold rounded-md shadow border border-slate-700 whitespace-nowrap">
              {destinationLocation.address || 'Hospital Emergency Bay'}
            </span>
          </div>

          {/* 🚗 Uber 3D Sports Car / Ambulance Marker (Dynamic 60fps Lerp Position & Rotation) */}
          <div
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) rotate(${currentCarCoords.heading || 0}deg)`,
              transition: 'transform 0.1s ease-out',
            }}
            className="absolute z-20 flex items-center justify-center cursor-pointer group"
          >
            {/* Glowing Radar Halo */}
            <div className="w-20 h-20 rounded-full bg-blue-500/20 animate-ping absolute pointer-events-none"></div>

            {/* High-Fidelity Vector Vehicle SVG */}
            <div className="relative drop-shadow-[0_12px_24px_rgba(37,99,235,0.6)]">
              <svg width="48" height="72" viewBox="0 0 48 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Car Shadow */}
                <ellipse cx="24" cy="38" rx="20" ry="32" fill="rgba(0,0,0,0.45)" />
                {/* Car Body Chassis */}
                <rect x="8" y="6" width="32" height="60" rx="12" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="2.5" />
                {/* Windshield */}
                <rect x="12" y="18" width="24" height="14" rx="4" fill="#0F172A" />
                {/* Emergency Siren Light */}
                <circle cx="24" cy="34" r="4" fill="#EF4444" className="animate-pulse" />
                {/* Rear Window */}
                <rect x="13" y="44" width="22" height="10" rx="3" fill="#0F172A" />
                {/* Front Headlights Beam */}
                <polygon points="12,6 4,0 20,0" fill="rgba(255,255,255,0.7)" />
                <polygon points="36,6 28,0 44,0" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
          </div>
        </div>

        {/* 📱 Bottom Uber ETA Floating Panel */}
        <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-800 z-30 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                <Navigation className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-white">{driverName}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                    En Route to Destination
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Remaining: <strong>{distanceRemainingKm} km</strong> | Live ETA:{' '}
                  <strong className="text-emerald-400">~{etaMinutes} min</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`tel:${driverPhone}`}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span>Call Driver</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UberDriverLiveMap;
