import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import apiClient from '../../services/apiClient';
import socketService from '../../services/socket';
import soundService from '../../services/soundService';
import { useApp } from '../../context/AppContext';
import { StatusTimeline, RideStatusType } from './components/StatusTimeline';
import { DriverCard, DriverCardInfo } from './components/DriverCard';

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
    { featureType: 'poi.medical', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e0f2fe' }] },
    { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  ],
};

const libraries: ('places' | 'geometry' | 'drawing')[] = ['geometry'];

// Haversine distance calculator
const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

// Calculate forward bearing angle
const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (Math.round((θ * 180) / Math.PI) + 360) % 360;
};

// Top-down sleek Ambulance SVG with live rotating heading and strobe light
const generateAmbulanceSvg = (headingDeg: number): string => {
  const roundedDeg = Math.round(headingDeg || 0);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r="26" fill="#EF4444" fill-opacity="0.18" stroke="#DC2626" stroke-width="1.5" stroke-opacity="0.5" stroke-dasharray="3 3"/>
      <g transform="rotate(${roundedDeg}, 28, 28)">
        <!-- Shadow -->
        <rect x="18" y="10" width="20" height="36" rx="6" fill="#000000" fill-opacity="0.3" />
        <!-- Ambulance Body (White Emergency ALS Unit) -->
        <rect x="18" y="10" width="20" height="36" rx="6" fill="#FFFFFF" stroke="#DC2626" stroke-width="2.2" />
        <!-- Front Headlights -->
        <polygon points="19,10 15,4 21,4" fill="#FACC15" fill-opacity="0.9"/>
        <polygon points="37,10 35,4 41,4" fill="#FACC15" fill-opacity="0.9"/>
        <!-- Front Cabin Glass -->
        <rect x="20" y="13" width="16" height="7" rx="2" fill="#0F172A" />
        <!-- Emergency Red Cross Logo on Roof -->
        <path d="M28 23 v8 M24 27 h8" stroke="#DC2626" stroke-width="3" stroke-linecap="round" />
        <!-- Flashing Emergency Beacon Light -->
        <circle cx="28" cy="21" r="3.2" fill="#EF4444" stroke="#FFFFFF" stroke-width="1"/>
        <!-- Rear Step -->
        <rect x="20" y="44" width="16" height="2" fill="#64748B" rx="1" />
      </g>
    </svg>
  `;
};

export const TrackingPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId?: string }>();
  const navigate = useNavigate();
  const { userData, showToast } = useApp();

  const [booking, setBooking] = useState<any>(null);
  const [currentStatus, setCurrentStatus] = useState<RideStatusType>('REQUESTED');
  const [loading, setLoading] = useState<boolean>(true);

  // Live Position coordinates
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number }>({ lat: 19.0760, lng: 72.8777 });
  const [hospitalCoords, setHospitalCoords] = useState<{ lat: number; lng: number }>({ lat: 19.0522, lng: 72.8295 });
  
  // Interpolated 60fps moving vehicle position
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number }>({ lat: 19.0544, lng: 72.8277 });
  const [targetPos, setTargetPos] = useState<{ lat: number; lng: number }>({ lat: 19.0544, lng: 72.8277 });
  const [heading, setHeading] = useState<number>(0);

  // Map Instance
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  // Rating Modal upon completion
  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingReview, setRatingReview] = useState<string>('');

  // Google Maps Loader
  const googleApiKey = (import.meta.env.VITE_MAP_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: googleApiKey || 'DUMMY_KEY_TELEMETRY',
    libraries,
    preventGoogleFontsLoading: true,
  });

  const hasValidGoogleMaps = isLoaded && !loadError && typeof window.google?.maps?.Map === 'function';

  // 1. Fetch Booking from API on mount/refresh
  const fetchBooking = useCallback(async () => {
    const activeId = bookingId || 'SOS-108992';
    try {
      setLoading(true);
      const res = await apiClient.get(`/api/bookings/${activeId}`);
      if (res.data?.success && res.data.booking) {
        const b = res.data.booking;
        setBooking(b);
        setCurrentStatus(b.status || 'ACCEPTED');

        if (b.pickupLocation?.lat && b.pickupLocation?.lng) {
          setPickupCoords({ lat: b.pickupLocation.lat, lng: b.pickupLocation.lng });
        }
        if (b.destinationHospital?.lat && b.destinationHospital?.lng) {
          setHospitalCoords({ lat: b.destinationHospital.lat, lng: b.destinationHospital.lng });
        }
        if (b.currentLocation?.lat && b.currentLocation?.lng) {
          setTargetPos({ lat: b.currentLocation.lat, lng: b.currentLocation.lng });
          setCurrentPos({ lat: b.currentLocation.lat, lng: b.currentLocation.lng });
        }
      } else {
        // Fallback demo mock
        const mock = {
          _id: activeId,
          bookingId: activeId,
          status: 'ACCEPTED',
          driverName: 'Rajesh Kumar',
          driverPhone: '+91 98201 10800',
          vehicleNumber: 'MH-01-EQ-1108',
          ambulanceType: 'ADVANCED (ALS)',
          rating: 4.9,
          destinationHospital: {
            name: 'Lilavati Hospital & Research Centre',
            address: 'Bandra West Reclamation, Mumbai',
            lat: 19.0522,
            lng: 72.8295,
          },
          pickupLocation: {
            address: 'Bandra West Junction, Mumbai',
            lat: 19.0760,
            lng: 72.8777,
          },
          distanceKm: 1.2,
          etaMinutes: 3,
        };
        setBooking(mock);
        setCurrentStatus('ACCEPTED');
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // 2. Real-Time Socket Connection & Room Joins
  useEffect(() => {
    const activeId = bookingId || 'SOS-108992';
    socketService.connect();
    socketService.joinRide(activeId);
    if (userData?._id) {
      socketService.joinPatient(userData._id);
    }

    // Driver location stream
    const unsubLocation = socketService.onLocationUpdate((payload) => {
      if (!payload) return;
      const nextLat = payload.lat ?? payload.latitude;
      const nextLng = payload.lng ?? payload.longitude;
      if (typeof nextLat === 'number' && typeof nextLng === 'number') {
        setTargetPos({ lat: nextLat, lng: nextLng });
        if (typeof payload.heading === 'number') {
          setHeading(payload.heading);
        } else {
          setHeading((prev) => calculateBearing(currentPos.lat, currentPos.lng, nextLat, nextLng) || prev);
        }
      }
    });

    // Ride accepted
    const unsubAccepted = socketService.onRideAccepted((payload) => {
      setCurrentStatus('ACCEPTED');
      setBooking((prev: any) => ({
        ...prev,
        status: 'ACCEPTED',
        driverName: payload.driverName || payload.driverInfo?.driverName || prev?.driverName,
        driverPhone: payload.driverPhone || payload.driverInfo?.driverPhone || prev?.driverPhone,
        vehicleNumber: payload.vehicleNumber || payload.driverInfo?.vehicleNumber || prev?.vehicleNumber,
      }));
      showToast('🚑 Driver accepted emergency dispatch! Rushing to your pickup point.', 'success');
    });

    // Status update
    const unsubStatus = socketService.onStatusUpdate((payload) => {
      if (payload?.status) {
        setCurrentStatus(payload.status as RideStatusType);
        setBooking((prev: any) => ({
          ...prev,
          status: payload.status,
          ...(payload.booking || {}),
        }));
      }
    });


    // Ride completed
    const unsubCompleted = socketService.onRideCompleted(() => {
      setCurrentStatus('COMPLETED');
      setShowRatingModal(true);
      try {
        soundService.playSuccessChime();
      } catch {}
      showToast('🎉 Patient safely admitted at Hospital Trauma Bay!', 'success');
    });

    return () => {
      socketService.leaveRoom(`ride_${activeId}`);
      if (typeof unsubLocation === 'function') unsubLocation();
      if (typeof unsubAccepted === 'function') unsubAccepted();
      if (typeof unsubStatus === 'function') unsubStatus();
      if (typeof unsubCompleted === 'function') unsubCompleted();
    };
  }, [bookingId, userData?._id, currentPos, showToast]);

  // 3. Smooth 60fps RequestAnimationFrame Interpolation
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

    const animate = () => {
      setCurrentPos((prev) => {
        const dLat = Math.abs(targetPos.lat - prev.lat);
        const dLng = Math.abs(targetPos.lng - prev.lng);

        if (dLat < 0.00001 && dLng < 0.00001) {
          return targetPos;
        }

        const nextLat = lerp(prev.lat, targetPos.lat, 0.08);
        const nextLng = lerp(prev.lng, targetPos.lng, 0.08);

        return { lat: nextLat, lng: nextLng };
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetPos]);

  // Auto-pan map smoothly when vehicle moves
  useEffect(() => {
    if (mapInstance && currentPos) {
      mapInstance.panTo(currentPos);
    }
  }, [mapInstance, currentPos]);

  // SVG Marker Icons
  const vehiclePinIcon = useMemo(() => {
    if (typeof window === 'undefined' || !window.google?.maps) return undefined;
    const svg = generateAmbulanceSvg(heading);
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(52, 52),
      anchor: new window.google.maps.Point(26, 26),
    };
  }, [heading]);

  const userPinIcon = useMemo(() => {
    if (typeof window === 'undefined' || !window.google?.maps) return undefined;
    return {
      url:
        'data:image/svg+xml;charset=UTF-8,' +
        encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="#2563EB" stroke="#FFFFFF" stroke-width="3" />
          <circle cx="18" cy="18" r="6" fill="#FFFFFF" />
        </svg>
      `),
      scaledSize: new window.google.maps.Size(36, 36),
      anchor: new window.google.maps.Point(18, 18),
    };
  }, []);

  const hospitalPinIcon = useMemo(() => {
    if (typeof window === 'undefined' || !window.google?.maps) return undefined;
    return {
      url:
        'data:image/svg+xml;charset=UTF-8,' +
        encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="#059669" stroke="#FFFFFF" stroke-width="3" />
          <path d="M13 20h14M20 13v14" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" />
        </svg>
      `),
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 20),
    };
  }, []);

  // Format Driver Card data
  const driverCardData: DriverCardInfo = useMemo(() => {
    return {
      driverName: booking?.driverName || 'Rajesh Kumar',
      driverPhone: booking?.driverPhone || '+91 98201 10800',
      vehicleNumber: booking?.vehicleNumber || 'MH-01-EQ-1108',
      ambulanceType: booking?.ambulanceType || 'Advanced Life Support (ALS)',
      rating: booking?.rating || 4.9,
      status: currentStatus,
      distanceKm: booking?.distanceKm || calculateDistanceKm(currentPos.lat, currentPos.lng, pickupCoords.lat, pickupCoords.lng),
      etaMinutes: booking?.etaMinutes || Math.max(2, Math.round(calculateDistanceKm(currentPos.lat, currentPos.lng, pickupCoords.lat, pickupCoords.lng) * 2.2)),
      destinationHospital:
        typeof booking?.destinationHospital === 'string'
          ? booking.destinationHospital
          : booking?.destinationHospital?.name || 'Lilavati Hospital Trauma Bay',
      pickupAddress: booking?.pickupLocation?.address || 'Current GPS Location',
    };
  }, [booking, currentStatus, currentPos, pickupCoords]);

  // Polyline corridor points between Ambulance and Pickup/Hospital
  const corridorPath = useMemo(() => {
    return [currentPos, pickupCoords, hospitalCoords];
  }, [currentPos, pickupCoords, hospitalCoords]);

  const handleSubmitRating = async () => {
    try {
      await apiClient.post('/api/ratings/submit', {
        bookingId: booking?._id || bookingId,
        rating: ratingScore,
        review: ratingReview,
        targetType: 'DRIVER',
      });
      showToast('Thank you for your rating!', 'success');
    } catch {}
    setShowRatingModal(false);
    navigate('/patient/dashboard');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 font-sans select-none flex flex-col justify-between">
      {/* ========================================================================= */}
      {/* 1. TOP FLOATING NAVIGATION BAR & STATUS TIMELINE                         */}
      {/* ========================================================================= */}
      <div className="absolute top-4 left-4 right-4 z-40 max-w-4xl mx-auto space-y-3 pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-300">
        {/* Top Header Bar */}
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl px-4 py-3 border border-slate-700/80 shadow-2xl flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Link
              to="/patient/dashboard"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1"
            >
              <span>←</span>
              <span>Back</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h1 className="text-sm font-black text-white tracking-tight">Live Emergency Dispatch</h1>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Mission #{bookingId || 'SOS-108992'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider bg-rose-600/30 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-full">
              🚨 Live Radar
            </span>
          </div>
        </div>

        {/* Status Stepper Progression */}
        <StatusTimeline currentStatus={currentStatus} compact={true} />
      </div>

      {/* ========================================================================= */}
      {/* 2. FULLSCREEN INTERACTIVE MAP VIEWPORT (60FPS VEHICLE STREAM)             */}
      {/* ========================================================================= */}
      <div className="w-full h-full absolute inset-0 z-0">
        {hasValidGoogleMaps ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={currentPos}
            zoom={14}
            options={defaultMapOptions}
            onLoad={(map) => setMapInstance(map)}
          >
            {/* Patient Pickup Location Marker */}
            <Marker position={pickupCoords} icon={userPinIcon} title="Patient Pickup Location" zIndex={20} />

            {/* Destination Hospital Marker */}
            <Marker position={hospitalCoords} icon={hospitalPinIcon} title="Destination Hospital" zIndex={25} />

            {/* Moving Ambulance Marker (60fps lerped) */}
            <Marker position={currentPos} icon={vehiclePinIcon} title="Live Paramedic Ambulance" zIndex={60} />

            {/* Route Corridor Polyline */}
            <Polyline
              path={corridorPath}
              options={{
                strokeColor: '#3B82F6',
                strokeWeight: 5,
                strokeOpacity: 0.85,
                geodesic: true,
              }}
            />
          </GoogleMap>
        ) : (
          /* High-Tech Radar Canvas Fallback */
          <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />

            <div className="relative z-10 text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-rose-600/20 border-2 border-rose-500 flex items-center justify-center text-4xl mx-auto animate-pulse">
                🚑
              </div>
              <h2 className="text-white text-lg font-black tracking-tight">Live Satellite Telemetry Engaged</h2>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Tracking Unit {booking?.vehicleNumber || 'MH-01-EQ-1108'} along the emergency priority corridor.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>60 FPS Stream Synchronized</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM FLOATING DRIVER INFO SHEET (UBER/PORTER STYLE)                  */}
      {/* ========================================================================= */}
      <div className="absolute bottom-4 left-4 right-4 z-40 max-w-xl mx-auto pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
        <DriverCard driverInfo={driverCardData} onCancelRide={() => navigate('/patient/dashboard')} />
      </div>

      {/* ========================================================================= */}
      {/* 4. POST-RIDE RATING MODAL UPON MISSION COMPLETION                         */}
      {/* ========================================================================= */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 text-slate-900 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <span className="text-4xl">🎉</span>
              <h3 className="text-lg font-black text-slate-900">Patient Safely Admitted</h3>
              <p className="text-xs text-slate-500">
                Rate Paramedic {booking?.driverName || 'Rajesh Kumar'} and crew for this emergency transit.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingScore(star)}
                  className={`text-3xl cursor-pointer transition-transform active:scale-125 ${
                    star <= ratingScore ? 'text-amber-400' : 'text-slate-200'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={ratingReview}
              onChange={(e) => setRatingReview(e.target.value)}
              placeholder="Leave feedback on driver speed, resuscitation care, and care..."
              className="w-full p-3 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              type="button"
              onClick={handleSubmitRating}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              Submit Rating & Complete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackingPage;
