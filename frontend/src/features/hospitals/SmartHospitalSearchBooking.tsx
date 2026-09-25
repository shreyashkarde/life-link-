import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import apiClient from '../../services/apiClient';
import { useApp } from '../../context/AppContext';
import socketService from '../../services/socket';
import soundService from '../../services/soundService';

export interface HospitalItem {
  id: string;
  hospitalId: string;
  _id?: string;
  name: string;
  address: string;
  city?: string;
  lat: number;
  lng: number;
  location?: { lat: number; lng: number };
  phone?: string;
  contactPhone?: string;
  emergencyContact?: string;
  traumaLevel?: string;
  icuBedsAvailable?: number;
  totalBeds?: number;
  rating?: number;
  doctorsCount?: number;
  specialities?: string[];
  distanceKm?: number;
  estimatedDriveMinutes?: number;
  ambulanceServiceAvailable?: boolean;
}

export interface DoctorInfo {
  _id: string;
  id?: string;
  name: string;
  speciality: string;
  degree?: string;
  experience?: string;
  about?: string;
  fees: number;
  image?: string;
  available?: boolean;
  isAvailable?: boolean;
  availabilityStatus?: 'Available' | 'Busy';
  hospitalId?: string;
  hospitalName?: string;
  slots?: string[];
  slots_booked?: Record<string, string[]>;
}

interface SmartHospitalSearchBookingProps {
  initialHospitalId?: string;
  onAppointmentBooked?: (appointment: any) => void;
  className?: string;
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
    { featureType: 'poi.medical', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e9e9e9' }, { lightness: 17 }] },
    { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }, { lightness: 17 }] },
  ],
};

const libraries: ('places' | 'geometry' | 'drawing')[] = ['geometry'];

export const DEFAULT_FALLBACK_HOSPITALS: HospitalItem[] = [
  {
    id: 'hosp_lilavati',
    hospitalId: 'hosp_lilavati',
    _id: 'hosp_lilavati',
    name: 'Lilavati Hospital & Research Centre',
    address: 'A-791, Bandra Reclamation, Bandra West, Mumbai 400050',
    city: 'Mumbai',
    lat: 19.0522,
    lng: 72.8295,
    location: { lat: 19.0522, lng: 72.8295 },
    phone: '+91 22 2675 1000',
    emergencyContact: '+91 22 2656 8000',
    traumaLevel: 'Level 1 Apex Trauma Center',
    icuBedsAvailable: 14,
    totalBeds: 323,
    rating: 4.9,
    doctorsCount: 3,
    specialities: ['General physician', 'Cardiology', 'Neurology', 'Trauma & Emergency', 'Orthopedics'],
    ambulanceServiceAvailable: true,
  },
  {
    id: 'hosp_hinduja',
    hospitalId: 'hosp_hinduja',
    _id: 'hosp_hinduja',
    name: 'P. D. Hinduja National Hospital & Medical Research Centre',
    address: 'Veer Savarkar Marg, Mahim West, Mumbai 400016',
    city: 'Mumbai',
    lat: 19.0330,
    lng: 72.8397,
    location: { lat: 19.0330, lng: 72.8397 },
    phone: '+91 22 2445 1515',
    emergencyContact: '+91 22 2445 2222',
    traumaLevel: 'Level 1 Trauma Care',
    icuBedsAvailable: 18,
    totalBeds: 400,
    rating: 4.8,
    doctorsCount: 2,
    specialities: ['Gynecologist', 'General physician', 'Oncology', 'Nephrology'],
    ambulanceServiceAvailable: true,
  },
  {
    id: 'hosp_nanavati',
    hospitalId: 'hosp_nanavati',
    _id: 'hosp_nanavati',
    name: 'Nanavati Max Super Speciality Hospital',
    address: 'Swami Vivekananda Rd, Vile Parle West, Mumbai 400056',
    city: 'Mumbai',
    lat: 19.0968,
    lng: 72.8413,
    location: { lat: 19.0968, lng: 72.8413 },
    phone: '+91 22 2626 7500',
    emergencyContact: '+91 22 2618 2255',
    traumaLevel: 'Level 1 Super Speciality Apex',
    icuBedsAvailable: 22,
    totalBeds: 350,
    rating: 4.8,
    doctorsCount: 2,
    specialities: ['Dermatologist', 'General physician', 'Cardiac Sciences', 'Critical Care'],
    ambulanceServiceAvailable: true,
  },
  {
    id: 'hosp_kokilaben',
    hospitalId: 'hosp_kokilaben',
    _id: 'hosp_kokilaben',
    name: 'Kokilaben Dhirubhai Ambani Hospital',
    address: 'Rao Saheb, Achutrao Patwardhan Marg, Four Bungalows, Andheri West, Mumbai 400053',
    city: 'Mumbai',
    lat: 19.1311,
    lng: 72.8252,
    location: { lat: 19.1311, lng: 72.8252 },
    phone: '+91 22 4269 6969',
    emergencyContact: '+91 22 4269 9999',
    traumaLevel: 'Level 1 Tertiary Apex Center',
    icuBedsAvailable: 25,
    totalBeds: 750,
    rating: 4.9,
    doctorsCount: 3,
    specialities: ['Pediatricians', 'Neurologist', 'General physician', 'Robotic Surgery'],
    ambulanceServiceAvailable: true,
  },
  {
    id: 'hosp_breach_candy',
    hospitalId: 'hosp_breach_candy',
    _id: 'hosp_breach_candy',
    name: 'Breach Candy Hospital Trust',
    address: '60 A, Bhulabhai Desai Marg, Breach Candy, Cumballa Hill, Mumbai 400026',
    city: 'Mumbai',
    lat: 18.9712,
    lng: 72.8055,
    location: { lat: 18.9712, lng: 72.8055 },
    phone: '+91 22 2366 7788',
    emergencyContact: '+91 22 2367 1888',
    traumaLevel: 'Level 2 Premier Care Center',
    icuBedsAvailable: 12,
    totalBeds: 212,
    rating: 4.7,
    doctorsCount: 2,
    specialities: ['Gastroenterologist', 'General physician', 'Cardio Thoracic', 'General Surgery'],
    ambulanceServiceAvailable: true,
  },
  {
    id: 'hosp_apollo',
    hospitalId: 'hosp_apollo',
    _id: 'hosp_apollo',
    name: 'Apollo Hospitals Navi Mumbai',
    address: 'Plot # 13, Off Urban Haat, Sector 23, CBD Belapur, Navi Mumbai 400614',
    city: 'Navi Mumbai',
    lat: 19.0222,
    lng: 73.0416,
    location: { lat: 19.0222, lng: 73.0416 },
    phone: '+91 22 3350 3350',
    emergencyContact: '+91 22 3350 1066',
    traumaLevel: 'Level 1 Apex Emergency Hospital',
    icuBedsAvailable: 30,
    totalBeds: 500,
    rating: 4.9,
    doctorsCount: 2,
    specialities: ['Cardiology', 'Neurologist', 'Emergency Medicine', 'Transplant Center'],
    ambulanceServiceAvailable: true,
  },
  {
    id: 'hosp_fortis',
    hospitalId: 'hosp_fortis',
    _id: 'hosp_fortis',
    name: 'Fortis Hospital Mulund',
    address: 'Mulund Goregaon Link Rd, Industrial Area, Bhandup West, Mumbai 400078',
    city: 'Mumbai',
    lat: 19.1663,
    lng: 72.9362,
    location: { lat: 19.1663, lng: 72.9362 },
    phone: '+91 22 4365 4365',
    emergencyContact: '+91 22 4365 4999',
    traumaLevel: 'Level 1 Emergency & Cardiac Care',
    icuBedsAvailable: 20,
    totalBeds: 315,
    rating: 4.8,
    doctorsCount: 2,
    specialities: ['Cardiology', 'General physician', 'Pulmonology', 'Orthopedics'],
    ambulanceServiceAvailable: true,
  },
];

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

// Compute dynamic bearing / heading angle (0-360 deg)
const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (Math.round((θ * 180) / Math.PI) + 360) % 360;
};

// Generate realistic road waypoints with smooth cubic bezier curve
const generateRealisticRoadPath = (
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  pointsCount = 45
): Array<{ lat: number; lng: number }> => {
  const path: Array<{ lat: number; lng: number }> = [];
  const dLat = end.lat - start.lat;
  const dLng = end.lng - start.lng;

  // Realistic city road perpendicular offsets
  const perpLat = -dLng * 0.14;
  const perpLng = dLat * 0.14;

  const cp1 = { lat: start.lat + dLat * 0.28 + perpLat, lng: start.lng + dLng * 0.28 + perpLng };
  const cp2 = { lat: start.lat + dLat * 0.72 - perpLat * 0.7, lng: start.lng + dLng * 0.72 - perpLng * 0.7 };

  for (let i = 0; i <= pointsCount; i++) {
    const t = i / pointsCount;
    const lat =
      Math.pow(1 - t, 3) * start.lat +
      3 * Math.pow(1 - t, 2) * t * cp1.lat +
      3 * (1 - t) * Math.pow(t, 2) * cp2.lat +
      Math.pow(t, 3) * end.lat;
    const lng =
      Math.pow(1 - t, 3) * start.lng +
      3 * Math.pow(1 - t, 2) * t * cp1.lng +
      3 * (1 - t) * Math.pow(t, 2) * cp2.lng +
      Math.pow(t, 3) * end.lng;
    path.push({ lat, lng });
  }
  return path;
};

// Interpolate position and forward heading along road vertices at progress t (0..1)
const interpolateAlongPath = (
  subpath: Array<{ lat: number; lng: number }>,
  t: number
): { pos: { lat: number; lng: number }; heading: number } => {
  if (!subpath || subpath.length === 0) {
    return { pos: { lat: 0, lng: 0 }, heading: 0 };
  }
  if (subpath.length === 1 || t <= 0) {
    const heading = subpath.length > 1 ? calculateBearing(subpath[0].lat, subpath[0].lng, subpath[1].lat, subpath[1].lng) : 0;
    return { pos: subpath[0], heading };
  }
  if (t >= 1) {
    const last = subpath[subpath.length - 1];
    const prev = subpath[subpath.length - 2] || last;
    const heading = calculateBearing(prev.lat, prev.lng, last.lat, last.lng);
    return { pos: last, heading };
  }

  const segmentLengths: number[] = [];
  let totalLength = 0;

  for (let i = 0; i < subpath.length - 1; i++) {
    const len = calculateDistanceKm(subpath[i].lat, subpath[i].lng, subpath[i + 1].lat, subpath[i + 1].lng);
    segmentLengths.push(len);
    totalLength += len;
  }

  if (totalLength === 0) {
    return { pos: subpath[0], heading: 0 };
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

  return { pos: subpath[subpath.length - 1], heading: 0 };
};

// Top-down sleek car / medical transport SVG generator with rotating heading
const generateCarSvg = (headingDeg: number): string => {
  const roundedDeg = Math.round(headingDeg || 0);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
      <!-- Radiating GPS Telemetry Radar Pulse -->
      <circle cx="26" cy="26" r="24" fill="#3B82F6" fill-opacity="0.16" stroke="#2563EB" stroke-width="1.5" stroke-opacity="0.45" stroke-dasharray="3 3"/>
      
      <!-- Rotating Vehicle Chassis Group -->
      <g transform="rotate(${roundedDeg}, 26, 26)">
        <!-- Drop Shadow -->
        <rect x="16" y="8" width="20" height="36" rx="6" fill="#000000" fill-opacity="0.25" filter="blur(1px)" />

        <!-- Car Outer Body (Sleek Blue Medical Transport) -->
        <rect x="16" y="8" width="20" height="36" rx="6" fill="#2563EB" stroke="#FFFFFF" stroke-width="1.8" />

        <!-- Front Headlight Beams -->
        <polygon points="17,8 13,2 19,2" fill="#FACC15" fill-opacity="0.8"/>
        <polygon points="35,8 33,2 39,2" fill="#FACC15" fill-opacity="0.8"/>

        <!-- Front Windshield Cabin -->
        <rect x="18" y="11" width="16" height="7" rx="2" fill="#0F172A" />

        <!-- Roof / Cabin -->
        <rect x="18" y="19" width="16" height="13" rx="1.5" fill="#1D4ED8" />

        <!-- Flashing Emergency Beacon Strobe -->
        <circle cx="26" cy="24" r="3" fill="#EF4444" stroke="#FFFFFF" stroke-width="0.8"/>

        <!-- Rear Windshield -->
        <rect x="18" y="33" width="16" height="4" rx="1" fill="#0F172A" />

        <!-- Taillights -->
        <rect x="16" y="42" width="5" height="2" fill="#EF4444" rx="0.5" />
        <rect x="31" y="42" width="5" height="2" fill="#EF4444" rx="0.5" />

        <!-- Directional Front Indicator Point -->
        <polygon points="26,5 22,9 30,9" fill="#FFFFFF" />
      </g>
    </svg>
  `;
};

// Dynamic turn-by-turn guidance maneuvers
const getTurnManeuver = (progress: number, hospitalName: string) => {
  if (progress < 0.15) {
    return {
      icon: '📍',
      action: 'Departing Origin',
      text: 'Departing from current location onto Main Road',
      distanceToTurn: '450 m',
      speed: 42,
    };
  }
  if (progress < 0.4) {
    return {
      icon: '↗️',
      action: 'Merge Ahead',
      text: 'Merge onto Express Medical Arterial Corridor',
      distanceToTurn: '850 m',
      speed: 64,
    };
  }
  if (progress < 0.7) {
    return {
      icon: '⬆️',
      action: 'Continue Straight',
      text: 'Stay on Priority Corridor via Flyover Bypass',
      distanceToTurn: '1.4 km',
      speed: 58,
    };
  }
  if (progress < 0.9) {
    return {
      icon: '↰',
      action: 'Turn Left',
      text: `Take exit toward ${hospitalName} Access Blvd`,
      distanceToTurn: '350 m',
      speed: 38,
    };
  }
  if (progress < 0.99) {
    return {
      icon: '🏥',
      action: 'Approaching Destination',
      text: `Arriving at ${hospitalName} Emergency & OPD Gate`,
      distanceToTurn: '120 m',
      speed: 24,
    };
  }
  return {
    icon: '🎉',
    action: 'Destination Reached',
    text: `You have arrived at ${hospitalName}!`,
    distanceToTurn: '0 m',
    speed: 0,
  };
};

export const SmartHospitalSearchBooking: React.FC<SmartHospitalSearchBookingProps> = ({
  initialHospitalId,
  onAppointmentBooked,
  className = '',
}) => {
  const { userData, token, showToast } = useApp();

  // User Geolocation (defaults to Mumbai Center)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 19.0760,
    lng: 72.8777,
  });
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [activeFilterTag, setActiveFilterTag] = useState<'ALL' | 'CLOSEST' | 'ICU_READY' | 'TRAUMA_1'>('ALL');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Hospitals Data
  const [hospitals, setHospitals] = useState<HospitalItem[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<HospitalItem | null>(null);
  const [loadingHospitals, setLoadingHospitals] = useState<boolean>(true);

  // Directions Feature
  const [showDirections, setShowDirections] = useState<boolean>(false);
  const [directionsInfo, setDirectionsInfo] = useState<{ distance: string; duration: string } | null>(null);

  // In-Portal Live Vehicle Navigation State (Directly on Map)
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [isNavPaused, setIsNavPaused] = useState<boolean>(false);
  const [isNavArrived, setIsNavArrived] = useState<boolean>(false);
  const [navProgress, setNavProgress] = useState<number>(0);
  const [navSpeedMultiplier, setNavSpeedMultiplier] = useState<number>(2); // 1x, 2x, 4x, 8x
  const [followVehicle, setFollowVehicle] = useState<boolean>(true);
  const [routePathPoints, setRoutePathPoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [vehiclePos, setVehiclePos] = useState<{ lat: number; lng: number }>(userLocation);
  const [vehicleHeading, setVehicleHeading] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Doctors for Selected Hospital
  const [hospitalDoctors, setHospitalDoctors] = useState<DoctorInfo[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState<boolean>(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorInfo | null>(null);

  // Appointment Booking State
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState<boolean>(false);
  const [bookingSuccessModal, setBookingSuccessModal] = useState<any | null>(null);

  // Map Instance
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [infoMarker, setInfoMarker] = useState<HospitalItem | null>(null);

  // Google Maps Loader
  const googleApiKey = (import.meta.env.VITE_MAP_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: googleApiKey || 'DUMMY_KEY_TELEMETRY',
    libraries,
    preventGoogleFontsLoading: true,
  });

  const hasValidGoogleMaps = isLoaded && !loadError && typeof window.google?.maps?.Map === 'function';

  // 1. Debounce Search Input (Step 10: Performance)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 280);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 2. Auto-Detect User's Geolocation
  const detectUserGps = useCallback(() => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'info');
      return;
    }
    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setIsLocatingUser(false);
        showToast('✓ GPS Location locked! Hospitals recalculated by proximity.', 'success');
        if (mapInstance) {
          mapInstance.panTo(coords);
          mapInstance.setZoom(13);
        }
      },
      () => {
        setIsLocatingUser(false);
        showToast('Using Mumbai Healthcare Hub coordinates', 'info');
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  }, [mapInstance, showToast]);

  // Auto detect once on mount
  useEffect(() => {
    detectUserGps();
  }, []);

  // 3. Fetch Nearby Hospitals (Step 2: Real Data with Fallback)
  const fetchHospitals = useCallback(
    async (queryText?: string) => {
      setLoadingHospitals(true);
      try {
        const query = queryText !== undefined ? queryText : debouncedQuery;
        const searchParam = query ? `&search=${encodeURIComponent(query)}` : '';
        const url = `/api/hospitals/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radiusKm=100${searchParam}`;

        const res = await apiClient.get(url);
        if (res.data?.success && Array.isArray(res.data.hospitals) && res.data.hospitals.length > 0) {
          setHospitals(res.data.hospitals);

          // Select first hospital if none selected
          if (!selectedHospital && res.data.hospitals.length > 0) {
            const initial = initialHospitalId
              ? res.data.hospitals.find((h: HospitalItem) => h.id === initialHospitalId || h.hospitalId === initialHospitalId) || res.data.hospitals[0]
              : res.data.hospitals[0];
            setSelectedHospital(initial);
          }
        } else {
          // Fallback to local default hospitals calculated with current user coords
          let fallback = DEFAULT_FALLBACK_HOSPITALS.map((hosp) => {
            const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, hosp.lat, hosp.lng);
            return {
              ...hosp,
              distanceKm: dist,
              estimatedDriveMinutes: Math.max(3, Math.round(dist * 2.2)),
            };
          });

          if (query) {
            const q = query.toLowerCase();
            fallback = fallback.filter((h) =>
              h.name.toLowerCase().includes(q) ||
              h.address.toLowerCase().includes(q) ||
              h.city?.toLowerCase().includes(q) ||
              h.specialities?.some((s) => s.toLowerCase().includes(q))
            );
          }

          fallback.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
          setHospitals(fallback);
          if (!selectedHospital && fallback.length > 0) {
            setSelectedHospital(fallback[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch hospitals, using fallback:', err);
        const fallback = DEFAULT_FALLBACK_HOSPITALS.map((hosp) => {
          const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, hosp.lat, hosp.lng);
          return {
            ...hosp,
            distanceKm: dist,
            estimatedDriveMinutes: Math.max(3, Math.round(dist * 2.2)),
          };
        }).sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

        setHospitals(fallback);
        if (!selectedHospital && fallback.length > 0) {
          setSelectedHospital(fallback[0]);
        }
      } finally {
        setLoadingHospitals(false);
      }
    },
    [debouncedQuery, userLocation, initialHospitalId, selectedHospital]
  );

  useEffect(() => {
    fetchHospitals(debouncedQuery);
  }, [debouncedQuery, userLocation.lat, userLocation.lng]);

  // 4. Fetch Doctors for Selected Hospital (Step 5: GET /api/doctors?hospitalId=XYZ)
  const fetchDoctorsForHospital = useCallback(
    async (hospId: string) => {
      setLoadingDoctors(true);
      try {
        const res = await apiClient.get(`/api/doctors?hospitalId=${encodeURIComponent(hospId)}`);
        if (res.data?.success && Array.isArray(res.data.doctors)) {
          setHospitalDoctors(res.data.doctors);
          if (res.data.doctors.length > 0) {
            setSelectedDoctor(res.data.doctors[0]);
          } else {
            setSelectedDoctor(null);
          }
        } else {
          setHospitalDoctors([]);
          setSelectedDoctor(null);
        }
      } catch (err) {
        console.error('Failed to load doctors for hospital:', err);
        setHospitalDoctors([]);
      } finally {
        setLoadingDoctors(false);
      }
    },
    []
  );

  // When selected hospital changes, load its doctors & generate route points
  useEffect(() => {
    if (selectedHospital) {
      const hospId = selectedHospital.hospitalId || selectedHospital.id || 'hosp_lilavati';
      fetchDoctorsForHospital(hospId);

      // Pan map smoothly to hospital if not navigating
      if (mapInstance && selectedHospital.lat && selectedHospital.lng && !isNavigating) {
        mapInstance.panTo({ lat: selectedHospital.lat, lng: selectedHospital.lng });
      }

      // Calculate directions telemetry
      const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, selectedHospital.lat, selectedHospital.lng);
      const estMin = Math.max(3, Math.round(dist * 2.2));
      setDirectionsInfo({
        distance: `${dist} km`,
        duration: `${estMin} mins`,
      });

      // Generate realistic route corridor vertices
      const fallbackPath = generateRealisticRoadPath(userLocation, {
        lat: selectedHospital.lat,
        lng: selectedHospital.lng,
      });
      setRoutePathPoints(fallbackPath);
      setVehiclePos(fallbackPath[0] || userLocation);
      setVehicleHeading(
        calculateBearing(
          userLocation.lat,
          userLocation.lng,
          fallbackPath[1]?.lat || fallbackPath[0]?.lat,
          fallbackPath[1]?.lng || fallbackPath[0]?.lng
        )
      );

      // Attempt Google DirectionsService for real road turns if available
      if (hasValidGoogleMaps && typeof window.google?.maps?.DirectionsService === 'function') {
        try {
          const directionsService = new window.google.maps.DirectionsService();
          directionsService.route(
            {
              origin: userLocation,
              destination: { lat: selectedHospital.lat, lng: selectedHospital.lng },
              travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === window.google.maps.DirectionsStatus.OK && result?.routes?.[0]) {
                const leg = result.routes[0].legs?.[0];
                if (leg?.distance?.text && leg?.duration?.text) {
                  setDirectionsInfo({
                    distance: leg.distance.text,
                    duration: leg.duration.text,
                  });
                }
                if (result.routes[0].overview_path && result.routes[0].overview_path.length > 1) {
                  const pts = result.routes[0].overview_path.map((p) => ({
                    lat: p.lat(),
                    lng: p.lng(),
                  }));
                  setRoutePathPoints(pts);
                }
              }
            }
          );
        } catch {
          // Fallback remains active
        }
      }
    }
  }, [selectedHospital, mapInstance, userLocation.lat, userLocation.lng, fetchDoctorsForHospital, hasValidGoogleMaps, isNavigating]);

  // 5. Real-Time 60fps Live Navigation Animation Loop (Directly inside portal)
  useEffect(() => {
    if (!isNavigating || isNavPaused || isNavArrived || routePathPoints.length < 2) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const durationMs = 24000; // 24 seconds for 1x full drive

    const animate = (currentTime: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = currentTime;
      }
      const dt = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      setNavProgress((prev) => {
        const step = (dt * navSpeedMultiplier) / durationMs;
        const next = Math.min(1, prev + step);

        const { pos, heading } = interpolateAlongPath(routePathPoints, next);
        setVehiclePos(pos);
        setVehicleHeading(heading);

        if (followVehicle && mapInstance && hasValidGoogleMaps) {
          mapInstance.panTo(pos);
        }

        if (next >= 1) {
          setIsNavArrived(true);
          setIsNavigating(false);
          try {
            soundService.playSuccessChime();
          } catch {
            // ignore
          }
          showToast(`🎉 Arrived at ${selectedHospital?.name || 'Hospital'}! Emergency trauma bay ready.`, 'success');
          return 1;
        }

        return next;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isNavigating, isNavPaused, isNavArrived, navSpeedMultiplier, routePathPoints, followVehicle, mapInstance, hasValidGoogleMaps, selectedHospital, showToast]);

  // Navigation Controller Functions
  const startNavigation = useCallback(() => {
    if (!selectedHospital) return;
    setShowDirections(true);
    setIsNavArrived(false);
    setIsNavPaused(false);
    if (navProgress >= 1) {
      setNavProgress(0);
    }
    setIsNavigating(true);
    showToast(`🚗 Live in-portal navigation started to ${selectedHospital.name}!`, 'info');

    if (mapInstance && routePathPoints.length > 0) {
      mapInstance.panTo(routePathPoints[0]);
      mapInstance.setZoom(14);
    }
  }, [selectedHospital, navProgress, mapInstance, routePathPoints, showToast]);

  const pauseNavigation = useCallback(() => {
    setIsNavPaused(true);
  }, []);

  const resumeNavigation = useCallback(() => {
    setIsNavPaused(false);
    setIsNavigating(true);
  }, []);

  const resetNavigation = useCallback(() => {
    setNavProgress(0);
    setIsNavArrived(false);
    setIsNavPaused(false);
    if (routePathPoints.length > 0) {
      setVehiclePos(routePathPoints[0]);
      const initialHeading = routePathPoints.length > 1
        ? calculateBearing(routePathPoints[0].lat, routePathPoints[0].lng, routePathPoints[1].lat, routePathPoints[1].lng)
        : 0;
      setVehicleHeading(initialHeading);
    }
    setIsNavigating(true);
  }, [routePathPoints]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setIsNavPaused(false);
    setNavProgress(0);
    setIsNavArrived(false);
    if (routePathPoints.length > 0) {
      setVehiclePos(routePathPoints[0]);
    }
  }, [routePathPoints]);

  // Dynamic remaining metrics during live navigation
  const remainingDistance = useMemo(() => {
    if (!directionsInfo?.distance) return '0 km';
    const totalKm = parseFloat(directionsInfo.distance) || 5;
    const rem = Math.max(0, totalKm * (1 - navProgress));
    return rem < 1 ? `${Math.round(rem * 1000)} m` : `${rem.toFixed(1)} km`;
  }, [directionsInfo, navProgress]);

  const remainingEta = useMemo(() => {
    if (!directionsInfo?.duration) return '0 mins';
    const totalMin = parseInt(directionsInfo.duration) || 10;
    const rem = Math.max(1, Math.round(totalMin * (1 - navProgress)));
    return `${rem} min${rem > 1 ? 's' : ''}`;
  }, [directionsInfo, navProgress]);

  const currentManeuver = useMemo(() => {
    return getTurnManeuver(navProgress, selectedHospital?.name || 'Hospital');
  }, [navProgress, selectedHospital]);

  // Traveled road points for active polyline
  const traveledPathPoints = useMemo(() => {
    if (!routePathPoints || routePathPoints.length < 2 || navProgress <= 0) return [];
    const count = Math.max(1, Math.floor(navProgress * (routePathPoints.length - 1)));
    const pts = routePathPoints.slice(0, count + 1);
    pts.push(vehiclePos);
    return pts;
  }, [routePathPoints, navProgress, vehiclePos]);

  // SVG Vehicle coordinate for fallback radar canvas
  const getRadarVehicleCoord = useCallback((t: number) => {
    const p0 = { x: 20, y: 68 };
    const p1 = { x: 35, y: 75 };
    const p2 = { x: 50, y: 42 };
    const p3 = { x: 78, y: 28 };
    const cx = Math.pow(1 - t, 3) * p0.x + 3 * Math.pow(1 - t, 2) * t * p1.x + 3 * (1 - t) * Math.pow(t, 2) * p2.x + Math.pow(t, 3) * p3.x;
    const cy = Math.pow(1 - t, 3) * p0.y + 3 * Math.pow(1 - t, 2) * t * p1.y + 3 * (1 - t) * Math.pow(t, 2) * p2.y + Math.pow(t, 3) * p3.y;
    const dx = 3 * Math.pow(1 - t, 2) * (p1.x - p0.x) + 6 * (1 - t) * t * (p2.x - p1.x) + 3 * Math.pow(t, 2) * (p3.x - p2.x);
    const dy = 3 * Math.pow(1 - t, 2) * (p1.y - p0.y) + 6 * (1 - t) * t * (p2.y - p1.y) + 3 * Math.pow(t, 2) * (p3.y - p2.y);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    return { x: cx, y: cy, angle };
  }, []);

  // 5. Real-Time Socket.IO Availability Updates (Step 7)
  useEffect(() => {
    socketService.connect();

    // Listen to real-time doctor availability changes
    const unsubDocAvail = socketService.onDoctorAvailability((data: any) => {
      if (!data?.doctorId) return;
      setHospitalDoctors((prev) =>
        prev.map((doc) => {
          if (doc._id === data.doctorId || doc.id === data.doctorId) {
            const isAvail = data.isAvailable !== undefined ? data.isAvailable : Boolean(data.available);
            return {
              ...doc,
              available: isAvail,
              isAvailable: isAvail,
              availabilityStatus: isAvail ? 'Available' : 'Busy',
              slots_booked: data.slots_booked || doc.slots_booked,
            };
          }
          return doc;
        })
      );
    });

    // Listen to newly booked appointments to update slots in real time
    const unsubNewAppt = socketService.onNewAppointment((appt: any) => {
      const docId = appt?.doctorId || appt?.docId || appt?.docData?._id;
      const slotDate = appt?.slotDate;
      const slotTime = appt?.slotTime || appt?.time;

      if (docId && slotDate && slotTime) {
        setHospitalDoctors((prev) =>
          prev.map((doc) => {
            if (doc._id === docId || doc.id === docId) {
              const currentBooked = doc.slots_booked || {};
              const existingDateSlots = currentBooked[slotDate] || [];
              if (!existingDateSlots.includes(slotTime)) {
                return {
                  ...doc,
                  slots_booked: {
                    ...currentBooked,
                    [slotDate]: [...existingDateSlots, slotTime],
                  },
                };
              }
            }
            return doc;
          })
        );
      }
    });

    return () => {
      unsubDocAvail();
      unsubNewAppt();
    };
  }, []);

  // 6. 7-Day Slot Dates Array
  const upcoming7Days = useMemo(() => {
    const dates: { dateStr: string; label: string; day: string }[] = [];
    const today = new Date();
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = `${d.getDate()}_${d.getMonth() + 1}_${d.getFullYear()}`;
      let label = `${dayNames[d.getDay()]} ${d.getDate()}`;
      if (i === 0) label = `Today`;
      if (i === 1) label = `Tomorrow`;

      dates.push({
        dateStr,
        label,
        day: dayNames[d.getDay()],
      });
    }
    return dates;
  }, []);

  // Default date selection
  useEffect(() => {
    if (upcoming7Days.length > 0 && !selectedDate) {
      setSelectedDate(upcoming7Days[0].dateStr);
    }
  }, [upcoming7Days, selectedDate]);

  // Standard Available Slots
  const defaultSlots = useMemo(
    () => [
      '10:00 am',
      '10:30 am',
      '11:00 am',
      '11:30 am',
      '12:00 pm',
      '04:30 pm',
      '05:00 pm',
      '05:30 pm',
      '06:00 pm',
      '06:30 pm',
    ],
    []
  );

  // Filtered Hospital List based on quick tags
  const displayedHospitals = useMemo(() => {
    let list = [...hospitals];
    if (activeFilterTag === 'CLOSEST') {
      return list.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }
    if (activeFilterTag === 'ICU_READY') {
      const filtered = list.filter((h) => (h.icuBedsAvailable || 0) >= 15);
      const result = filtered.length > 0 ? filtered : list;
      return [...result].sort((a, b) => (b.icuBedsAvailable || 0) - (a.icuBedsAvailable || 0));
    }
    if (activeFilterTag === 'TRAUMA_1') {
      const filtered = list.filter((h) =>
        (h.traumaLevel || '').toLowerCase().includes('level 1') ||
        (h.traumaLevel || '').toLowerCase().includes('apex')
      );
      const result = filtered.length > 0 ? filtered : list;
      return [...result].sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }
    return list;
  }, [hospitals, activeFilterTag]);

  // When filter or hospital list changes, ensure a valid hospital from displayed list is selected
  useEffect(() => {
    if (displayedHospitals.length > 0) {
      const exists = displayedHospitals.some(
        (h) => (h.id && h.id === selectedHospital?.id) || (h.hospitalId && h.hospitalId === selectedHospital?.hospitalId)
      );
      if (!exists) {
        setSelectedHospital(displayedHospitals[0]);
      }
    }
  }, [displayedHospitals, selectedHospital]);

  // 7. Appointment Booking Submission (Step 6)
  const handleBookAppointment = async () => {
    // Security check: must be logged in (Step 11)
    if (!token && !sessionStorage.getItem('token') && !localStorage.getItem('token')) {
      showToast('⚠️ Please login to book an appointment with this hospital specialist', 'error');
      return;
    }

    if (!selectedDoctor) {
      showToast('Please select a doctor to book consultation', 'info');
      return;
    }

    if (!selectedTimeSlot) {
      showToast('Please select an appointment time slot', 'info');
      return;
    }

    // Double-booking check
    const bookedForDate = selectedDoctor.slots_booked?.[selectedDate] || [];
    if (bookedForDate.includes(selectedTimeSlot)) {
      showToast('This time slot was just booked by another patient. Please choose another.', 'error');
      return;
    }

    setIsBookingSubmitting(true);
    try {
      const payload = {
        patientId: userData?._id || 'user_edward_101',
        doctorId: selectedDoctor._id,
        docId: selectedDoctor._id,
        hospitalId: selectedHospital?.hospitalId || selectedHospital?.id || 'hosp_lilavati',
        slotDate: selectedDate,
        slotTime: selectedTimeSlot,
        time: selectedTimeSlot,
        patientName: userData?.name || 'Patient',
      };

      const res = await apiClient.post('/api/appointments', payload);

      if (res.data?.success) {
        try {
          soundService.playSuccessChime();
        } catch {
          // Non-blocking
        }
        showToast(`✓ Consultation booked with ${selectedDoctor.name}!`, 'success');

        // Optimistically update slots
        setHospitalDoctors((prev) =>
          prev.map((doc) => {
            if (doc._id === selectedDoctor._id) {
              const currentSlots = doc.slots_booked || {};
              const dateSlots = currentSlots[selectedDate] || [];
              return {
                ...doc,
                slots_booked: {
                  ...currentSlots,
                  [selectedDate]: [...dateSlots, selectedTimeSlot],
                },
              };
            }
            return doc;
          })
        );

        setBookingSuccessModal(res.data.appointment || payload);
        if (onAppointmentBooked) {
          onAppointmentBooked(res.data.appointment || payload);
        }
      } else {
        showToast(res.data?.message || 'Could not complete booking', 'error');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Appointment booking failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  // Custom Google Maps SVG Marker Icons
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

  const hospitalPinIcon = useCallback(
    (isSelected: boolean) => {
      if (typeof window === 'undefined' || !window.google?.maps) return undefined;
      const bgColor = isSelected ? '#1E40AF' : '#059669';
      return {
        url:
          'data:image/svg+xml;charset=UTF-8,' +
          encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" fill="${bgColor}" stroke="#FFFFFF" stroke-width="3" />
            <path d="M13 20h14M20 13v14" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" />
          </svg>
        `),
        scaledSize: new window.google.maps.Size(40, 40),
        anchor: new window.google.maps.Point(20, 20),
      };
    },
    []
  );

  const vehiclePinIcon = useMemo(() => {
    if (typeof window === 'undefined' || !window.google?.maps) return undefined;
    const svg = generateCarSvg(vehicleHeading);
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(48, 48),
      anchor: new window.google.maps.Point(24, 24),
    };
  }, [vehicleHeading]);

  return (
    <div className={`w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col font-sans ${className}`}>
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & AUTOCOMPLETE SEARCH BAR (Step 1 & Step 8)                */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-7 relative z-30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏥</span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Find Hospitals & Book Doctors
              </h2>
              <span className="text-[10px] font-extrabold bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Live GPS + Practo Engine
              </span>
            </div>
            <p className="text-xs sm:text-sm text-blue-200 mt-1">
              Explore accredited apex hospitals, calculate live driving routes, and book specialist consultations instantly.
            </p>
          </div>

          {/* GPS Auto-Detect Button */}
          <button
            type="button"
            onClick={detectUserGps}
            disabled={isLocatingUser}
            className="self-start md:self-auto px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span className={isLocatingUser ? 'animate-spin' : 'animate-pulse'}>📍</span>
            <span>{isLocatingUser ? 'Acquiring GPS...' : 'Use My Current Location'}</span>
          </button>
        </div>

        {/* Search Bar with Autocomplete Dropdown */}
        <div className="relative w-full max-w-3xl">
          <div className="relative flex items-center">
            <span className="absolute left-4 text-slate-400 text-lg pointer-events-none">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search hospitals by name, area (e.g. Bandra, Andheri, Lilavati, Hinduja)..."
              className="w-full pl-12 pr-10 py-3 bg-white text-slate-900 text-sm rounded-2xl shadow-lg border border-transparent focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-medium placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSuggestions(false);
                }}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-2 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold px-3">
                <span>Matching Hospitals ({hospitals.length})</span>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(false)}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {hospitals.length > 0 ? (
                  hospitals.map((hosp) => (
                    <div
                      key={hosp.id || hosp.hospitalId}
                      onClick={() => {
                        setSelectedHospital(hosp);
                        setShowSuggestions(false);
                        setSearchQuery(hosp.name);
                      }}
                      className="p-3 hover:bg-blue-50/70 transition-colors cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🏥</span>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{hosp.name}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{hosp.address}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-blue-600">{hosp.distanceKm} km</span>
                        <p className="text-[10px] text-slate-400">~{hosp.estimatedDriveMinutes} mins</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No hospitals match &quot;{searchQuery}&quot;. Try &quot;Bandra&quot; or &quot;Lilavati&quot;.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 text-xs select-none">
            <button
              type="button"
              onClick={() => {
                setActiveFilterTag('ALL');
                if (hospitals.length > 0) setSelectedHospital(hospitals[0]);
                showToast(`Showing all ${hospitals.length} hospitals`, 'info');
              }}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition-all cursor-pointer shadow-xs ${
                activeFilterTag === 'ALL'
                  ? 'bg-white text-blue-900 shadow-md font-black scale-102 ring-2 ring-white/60'
                  : 'bg-white/10 hover:bg-white/20 text-blue-100'
              }`}
            >
              All Hospitals ({hospitals.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilterTag('CLOSEST');
                detectUserGps();
                const sorted = [...hospitals].sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
                if (sorted.length > 0) setSelectedHospital(sorted[0]);
                showToast('📍 Sorted by closest GPS proximity', 'info');
              }}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shadow-xs ${
                activeFilterTag === 'CLOSEST'
                  ? 'bg-white text-blue-900 shadow-md font-black scale-102 ring-2 ring-white/60'
                  : 'bg-white/10 hover:bg-white/20 text-blue-100'
              }`}
            >
              <span>📍</span> Closest by GPS
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilterTag('ICU_READY');
                const highIcu = hospitals.filter((h) => (h.icuBedsAvailable || 0) >= 15).sort((a, b) => (b.icuBedsAvailable || 0) - (a.icuBedsAvailable || 0));
                if (highIcu.length > 0) setSelectedHospital(highIcu[0]);
                showToast('🛏️ Filtered for High ICU Capacity centers', 'info');
              }}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shadow-xs ${
                activeFilterTag === 'ICU_READY'
                  ? 'bg-white text-blue-900 shadow-md font-black scale-102 ring-2 ring-white/60'
                  : 'bg-white/10 hover:bg-white/20 text-blue-100'
              }`}
            >
              <span>🛏️</span> High ICU Capacity ({hospitals.filter((h) => (h.icuBedsAvailable || 0) >= 15).length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilterTag('TRAUMA_1');
                const apex = hospitals.filter(
                  (h) =>
                    (h.traumaLevel || '').toLowerCase().includes('level 1') ||
                    (h.traumaLevel || '').toLowerCase().includes('apex')
                );
                if (apex.length > 0) setSelectedHospital(apex[0]);
                showToast('🚨 Filtered for certified Level 1 Apex emergency centers', 'info');
              }}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shadow-xs ${
                activeFilterTag === 'TRAUMA_1'
                  ? 'bg-white text-blue-900 shadow-md font-black scale-102 ring-2 ring-white/60'
                  : 'bg-white/10 hover:bg-white/20 text-blue-100'
              }`}
            >
              <span>🚨</span> Level 1 Apex Centers (
              {
                hospitals.filter(
                  (h) =>
                    (h.traumaLevel || '').toLowerCase().includes('level 1') ||
                    (h.traumaLevel || '').toLowerCase().includes('apex')
                ).length
              }
              )
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SPLIT LAYOUT: MAP VIEW (LEFT) + HOSPITAL & DOCTORS (RIGHT)            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* 🗺️ LEFT: GOOGLE MAPS / TELEMETRY LIVE CANVAS (Col 5) */}
        <div className="lg:col-span-5 h-[380px] sm:h-[460px] lg:h-auto relative bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-hidden">
          {hasValidGoogleMaps ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={
                isNavigating && followVehicle && vehiclePos
                  ? vehiclePos
                  : selectedHospital
                  ? { lat: selectedHospital.lat, lng: selectedHospital.lng }
                  : userLocation
              }
              zoom={isNavigating ? 14 : 13}
              options={defaultMapOptions}
              onLoad={(map) => setMapInstance(map)}
            >
              {/* User Position Beacon */}
              <Marker
                position={userLocation}
                icon={userPinIcon}
                title="Your Current Location"
                zIndex={20}
              />

              {/* Hospital Markers */}
              {displayedHospitals.map((hosp) => {
                const isSelected = selectedHospital?.id === hosp.id || selectedHospital?.hospitalId === hosp.hospitalId;
                return (
                  <Marker
                    key={hosp.id || hosp.hospitalId}
                    position={{ lat: hosp.lat, lng: hosp.lng }}
                    icon={hospitalPinIcon(isSelected)}
                    title={hosp.name}
                    zIndex={isSelected ? 30 : 10}
                    onClick={() => {
                      setSelectedHospital(hosp);
                      setInfoMarker(hosp);
                    }}
                  />
                );
              })}

              {/* Info Window on Selected Marker */}
              {infoMarker && (
                <InfoWindow
                  position={{ lat: infoMarker.lat, lng: infoMarker.lng }}
                  onCloseClick={() => setInfoMarker(null)}
                >
                  <div className="p-1 max-w-[200px] text-xs">
                    <p className="font-bold text-slate-900">{infoMarker.name}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5">{infoMarker.address}</p>
                    <div className="mt-1 flex items-center justify-between font-bold text-blue-600">
                      <span>{infoMarker.distanceKm} km away</span>
                      <span className="text-emerald-700">{infoMarker.icuBedsAvailable} ICU beds</span>
                    </div>
                  </div>
                </InfoWindow>
              )}

              {/* Dynamic Directions Route Corridor */}
              {showDirections && selectedHospital && routePathPoints.length > 0 && (
                <>
                  {/* Outer corridor glow line */}
                  <Polyline
                    path={routePathPoints}
                    options={{
                      strokeColor: '#3B82F6',
                      strokeWeight: 8,
                      strokeOpacity: 0.3,
                      geodesic: true,
                    }}
                  />
                  {/* Base Route Path */}
                  <Polyline
                    path={routePathPoints}
                    options={{
                      strokeColor: '#2563EB',
                      strokeWeight: 4,
                      strokeOpacity: 0.85,
                      geodesic: true,
                    }}
                  />
                  {/* Traveled Green Line when Navigating */}
                  {isNavigating && traveledPathPoints.length > 1 && (
                    <Polyline
                      path={traveledPathPoints}
                      options={{
                        strokeColor: '#10B981',
                        strokeWeight: 5,
                        strokeOpacity: 0.95,
                        geodesic: true,
                      }}
                    />
                  )}
                </>
              )}

              {/* Live Smooth Driving Vehicle Marker */}
              {showDirections && selectedHospital && (isNavigating || isNavArrived || navProgress > 0) && vehiclePos && (
                <Marker
                  position={vehiclePos}
                  icon={vehiclePinIcon}
                  title="Live In-Portal Vehicle Navigation"
                  zIndex={60}
                />
              )}
            </GoogleMap>
          ) : (
            /* Interactive Radar Telemetry Fallback Canvas */
            <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 relative flex flex-col justify-between select-none overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:28px_28px] opacity-40"></div>

              {/* SVG Connecting Road Corridor */}
              {showDirections && selectedHospital && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path
                    d="M 20 68 C 35 75, 50 42, 78 28"
                    fill="none"
                    stroke="#1E40AF"
                    strokeWidth="7"
                    strokeOpacity="0.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 20 68 C 35 75, 50 42, 78 28"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="3"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                    className="animate-pulse"
                  />
                  {(isNavigating || isNavArrived || navProgress > 0) && (
                    <path
                      d="M 20 68 C 35 75, 50 42, 78 28"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="100"
                      strokeDashoffset={100 - navProgress * 100}
                    />
                  )}
                </svg>
              )}

              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                  Radar Telemetry Map
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {displayedHospitals.length} Apex Centers Mapped
                </span>
              </div>

              {/* Start User Beacon */}
              <div className="absolute left-[20%] top-[68%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                <div className="w-7 h-7 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-xs animate-pulse">
                  📍
                </div>
                <span className="mt-1 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                  You
                </span>
              </div>

              {/* Destination Hospital Beacon */}
              <div className="absolute left-[78%] top-[28%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                <div className="w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-sm">
                  🏥
                </div>
                <span className="mt-1 bg-black/80 text-emerald-300 text-[9px] px-2 py-0.5 rounded font-bold max-w-[130px] truncate">
                  {selectedHospital?.name || 'Selected Hospital'}
                </span>
              </div>

              {/* In-Flight Moving Vehicle on Radar Canvas */}
              {showDirections && selectedHospital && (isNavigating || isNavArrived || navProgress > 0) && (() => {
                const coord = getRadarVehicleCoord(navProgress);
                return (
                  <div
                    className="absolute pointer-events-none transition-transform"
                    style={{
                      left: `${coord.x}%`,
                      top: `${coord.y}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 25,
                    }}
                  >
                    <div
                      className="relative transition-transform duration-75"
                      style={{ transform: `rotate(${coord.angle}deg)` }}
                    >
                      {/* Headlights beam */}
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-7 h-7 bg-gradient-to-t from-yellow-300/50 to-transparent blur-[1px] pointer-events-none"></div>
                      <div className="w-9 h-9 rounded-full bg-blue-600 border-2 border-white shadow-2xl flex items-center justify-center text-base ring-4 ring-blue-500/40">
                        🚗
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="relative z-10 bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-2 rounded-xl text-xs flex items-center justify-between text-slate-300">
                <span>Center: {selectedHospital?.name || 'Bandra Healthcare Hub'}</span>
                <span className="text-blue-400 font-bold">{directionsInfo?.distance || '1.2 km'}</span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* LIVE TOP NAVIGATION HUD (Turn-by-turn instruction banner on map)        */}
          {/* ========================================================================= */}
          {isNavigating && selectedHospital && (
            <div className="absolute top-3 left-3 right-3 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-3 text-xs z-30 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg shrink-0 shadow-md border border-blue-400/40">
                  {currentManeuver.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-500/20 px-1.5 py-0.2 rounded">
                      {currentManeuver.action}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      In {currentManeuver.distanceToTurn}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-100 truncate mt-0.5">
                    {currentManeuver.text}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 text-right">
                <div className="hidden sm:block">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Speed</p>
                  <p className="text-xs font-black text-amber-400">{currentManeuver.speed} km/h</p>
                </div>
                <div className="border-l border-slate-700 pl-2.5">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Remaining</p>
                  <p className="text-xs font-black text-blue-400">
                    {remainingDistance} • {remainingEta}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* LIVE BOTTOM NAVIGATION CONTROLLER (When Navigating)                      */}
          {/* ========================================================================= */}
          {isNavigating && selectedHospital && (
            <div className="absolute bottom-3 left-3 right-3 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl space-y-2 z-30 text-white animate-in fade-in slide-in-from-bottom-2">
              {/* Progress Bar & Seek */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Live In-Map Telemetry Route</span>
                  </span>
                  <span className="text-blue-400 font-black">{Math.round(navProgress * 100)}% Completed</span>
                </div>
                <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-75"
                    style={{ width: `${Math.round(navProgress * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-1.5">
                  {/* Pause / Resume */}
                  <button
                    type="button"
                    onClick={() => (isNavPaused ? resumeNavigation() : pauseNavigation())}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1 transition-all"
                  >
                    <span>{isNavPaused ? '▶' : '⏸'}</span>
                    <span>{isNavPaused ? 'Resume' : 'Pause'}</span>
                  </button>

                  {/* Reset */}
                  <button
                    type="button"
                    onClick={resetNavigation}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl cursor-pointer transition-all text-xs"
                    title="Restart Route"
                  >
                    ↺ Reset
                  </button>

                  {/* Speed Multiplier */}
                  <div className="flex items-center bg-slate-800/90 rounded-xl p-0.5 border border-slate-700">
                    {[1, 2, 4, 8].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setNavSpeedMultiplier(spd)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          navSpeedMultiplier === spd
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Follow Camera Toggle */}
                  <button
                    type="button"
                    onClick={() => setFollowVehicle(!followVehicle)}
                    className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs flex items-center gap-1 border ${
                      followVehicle
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    <span>🎯</span>
                    <span className="hidden sm:inline">Follow</span>
                  </button>

                  {/* Stop / Exit */}
                  <button
                    type="button"
                    onClick={stopNavigation}
                    className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl font-bold cursor-pointer transition-all text-xs"
                  >
                    ✕ Exit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DESTINATION ARRIVED CELEBRATION CARD                                      */}
          {/* ========================================================================= */}
          {isNavArrived && selectedHospital && (
            <div className="absolute bottom-3 left-3 right-3 bg-slate-900/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl p-4 shadow-2xl space-y-3 z-30 text-white animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl shrink-0 shadow-lg">
                  🎉
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                    Destination Reached!
                  </p>
                  <h4 className="text-sm font-extrabold text-white truncate">
                    {selectedHospital.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    You have arrived at the hospital entrance. Emergency trauma bay and OPD specialist consultations are ready.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={resetNavigation}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  🔄 Replay Navigation
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNavArrived(false);
                    const docSection = document.getElementById('hospital-selection-section');
                    if (docSection) {
                      docSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                >
                  👨‍⚕️ View Specialists
                </button>
                <button
                  type="button"
                  onClick={() => setIsNavArrived(false)}
                  className="px-3 py-2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DEFAULT FLOATING ROUTE STATUS BANNER (When NOT Navigating)                */}
          {/* ========================================================================= */}
          {directionsInfo && selectedHospital && !isNavigating && !isNavArrived && (
            <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-slate-200 shadow-xl flex items-center justify-between gap-3 text-xs z-30 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-xl shrink-0 shadow-xs">
                  🚗
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>Live Route:</span>
                    <span className="text-blue-600 font-black">{directionsInfo.duration}</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-bold border border-emerald-200">
                      Corridor Ready
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {directionsInfo.distance} via Arterial Corridor
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDirections(!showDirections)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors text-xs"
                >
                  {showDirections ? 'Hide Line' : 'Show Route'}
                </button>
                <button
                  type="button"
                  onClick={startNavigation}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-black rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md hover:shadow-blue-500/25 transition-all text-xs"
                >
                  <span className="animate-pulse">▶</span>
                  <span>Start Navigation</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 🏥 RIGHT: HOSPITAL DETAILS & DOCTOR BOOKING (Col 7) */}
        <div className="lg:col-span-7 p-5 sm:p-7 flex flex-col justify-between bg-slate-50/50 space-y-6">
          {/* ========================================================================= */}
          {/* QUICK HOSPITAL SELECTOR CAROUSEL                                          */}
          {/* ========================================================================= */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <span>🏥</span>
                <span>Select Hospital ({displayedHospitals.length})</span>
              </span>
              <span className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-lg font-bold">
                {activeFilterTag === 'CLOSEST' && '📍 Nearest by GPS'}
                {activeFilterTag === 'ICU_READY' && '🛏️ High ICU Capacity'}
                {activeFilterTag === 'TRAUMA_1' && '🚨 Level 1 Apex Emergency'}
                {activeFilterTag === 'ALL' && 'All Hospitals'}
              </span>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin select-none">
              {displayedHospitals.map((hosp) => {
                const isSelected =
                  (selectedHospital?.id && selectedHospital.id === hosp.id) ||
                  (selectedHospital?.hospitalId && selectedHospital.hospitalId === hosp.hospitalId) ||
                  selectedHospital?.name === hosp.name;

                return (
                  <button
                    key={hosp.id || hosp.hospitalId || hosp.name}
                    type="button"
                    onClick={() => {
                      setSelectedHospital(hosp);
                      if (mapInstance && hosp.lat && hosp.lng) {
                        mapInstance.panTo({ lat: hosp.lat, lng: hosp.lng });
                      }
                    }}
                    className={`shrink-0 text-left p-2.5 rounded-2xl border transition-all cursor-pointer min-w-[190px] max-w-[210px] ${
                      isSelected
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-600 shadow-md ring-2 ring-blue-400/40 scale-102'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className={`text-xs font-extrabold line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {hosp.name}
                      </p>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.2 rounded shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {hosp.distanceKm} km
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[10px]">
                      <span className={isSelected ? 'text-blue-100 font-medium' : 'text-emerald-700 font-bold'}>
                        🛏️ {hosp.icuBedsAvailable || 12} ICU
                      </span>
                      <span className={isSelected ? 'text-yellow-200 font-bold' : 'text-amber-600 font-bold'}>
                        ★ {hosp.rating || 4.8}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. SELECTED HOSPITAL CARD (Step 3)                                       */}
          {/* ========================================================================= */}
          {selectedHospital ? (
            <div className="bg-white rounded-2xl p-5 border border-blue-200/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏥</span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      {selectedHospital.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <span>📍</span> {selectedHospital.address}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs rounded-xl flex items-center gap-1">
                    <span>★</span> {selectedHospital.rating || 4.9}
                  </span>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs rounded-xl">
                    {selectedHospital.distanceKm} km away
                  </span>
                </div>
              </div>

              {/* Key Indicators Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Trauma Care</p>
                  <p className="font-extrabold text-slate-800 mt-0.5 line-clamp-1">
                    {selectedHospital.traumaLevel || 'Level 1 Trauma'}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <p className="text-[10px] text-emerald-700 font-bold uppercase">ICU Beds</p>
                  <p className="font-extrabold text-emerald-900 mt-0.5">
                    🛏️ {selectedHospital.icuBedsAvailable ?? 14} Available
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Emergency 24/7</p>
                  <p className="font-extrabold text-slate-800 mt-0.5 truncate">
                    {selectedHospital.emergencyContact || '+91 22 2656 8000'}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                  <p className="text-[10px] text-blue-700 font-bold uppercase">Drive Time</p>
                  <p className="font-extrabold text-blue-900 mt-0.5">
                    ⏱️ ~{selectedHospital.estimatedDriveMinutes || 4} mins
                  </p>
                </div>
              </div>

              {/* Action Buttons: "Get Directions" + "View Doctors" */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={startNavigation}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🚗</span>
                  <span>Start Live Navigation</span>
                </button>

                <a
                  href={`tel:${selectedHospital.emergencyContact || selectedHospital.phone || '+912226751000'}`}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <span>📞</span>
                  <span>Call Hospital Helpdesk</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-xs text-slate-500">
              Select a hospital on the map or search above to view its details.
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. DOCTORS LIST FOR THIS HOSPITAL (Step 5: GET /api/doctors?hospitalId=)   */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>👨‍⚕️</span> Available Specialists at {selectedHospital?.name?.replace(/ Hospital.*/, '') || 'Hospital'}
                </h4>
                <p className="text-xs text-slate-500">
                  Select a certified physician below to book immediate consultation.
                </p>
              </div>
              <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                {hospitalDoctors.length} Doctors
              </span>
            </div>

            {loadingDoctors ? (
              /* Skeleton Loader */
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-200 shrink-0"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : hospitalDoctors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {hospitalDoctors.map((doc) => {
                  const isSelected = selectedDoctor?._id === doc._id;
                  const isAvailable = doc.available !== false && (doc as any).isAvailable !== false;

                  return (
                    <div
                      key={doc._id}
                      onClick={() => setSelectedDoctor(doc)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={doc.image || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=160'}
                          alt={doc.name}
                          className="w-13 h-13 rounded-2xl object-cover border-2 border-slate-100 shadow-xs shrink-0"
                        />
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h5 className="text-xs font-bold text-slate-900 truncate">{doc.name}</h5>
                            {isAvailable ? (
                              <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Available
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full">
                                In Session
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-blue-600 font-semibold">{doc.speciality}</p>
                          <p className="text-[10px] text-slate-400">{doc.degree || 'MBBS, MD'} • {doc.experience || '4+ Yrs'}</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900">
                          ₹{doc.fees || 500} <span className="text-[10px] text-slate-400 font-normal">/ consult</span>
                        </span>
                        <span className={`text-[11px] font-bold ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                          {isSelected ? 'Selected ✓' : 'Select Doctor'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-xs text-slate-500">
                No specialists listed for this hospital right now.
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 5. SLOT SELECTOR & INSTANT BOOK BUTTON (Step 6)                           */}
          {/* ========================================================================= */}
          {selectedDoctor && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Select Consultation Slot with {selectedDoctor.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Real-time calendar synced with hospital OPD roster.
                  </p>
                </div>
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  Fee: ₹{selectedDoctor.fees || 500}
                </span>
              </div>

              {/* 7-Day Date Selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs select-none">
                {upcoming7Days.map((d) => {
                  const isSelected = selectedDate === d.dateStr;
                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => {
                        setSelectedDate(d.dateStr);
                        setSelectedTimeSlot('');
                      }}
                      className={`px-3 py-2 rounded-xl text-center font-bold transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <p className="text-[9px] uppercase tracking-wider opacity-80">{d.day}</p>
                      <p className="text-xs font-black">{d.label.replace(/.*\(/, '').replace(/\)/, '')}</p>
                    </button>
                  );
                })}
              </div>

              {/* Time Slots Grid */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-600">Available Time Slots:</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {defaultSlots.map((slot) => {
                    const bookedSlots = selectedDoctor.slots_booked?.[selectedDate] || [];
                    const isBooked = bookedSlots.includes(slot);
                    const isSelected = selectedTimeSlot === slot;

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isBooked}
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`py-2 px-2 text-center rounded-xl text-[11px] font-bold transition-all ${
                          isBooked
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-blue-600 text-white shadow-md cursor-pointer'
                            : 'bg-white hover:bg-blue-50 text-slate-700 border border-slate-200 hover:border-blue-300 cursor-pointer'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Book Appointment CTA Button (Step 6) */}
              <button
                type="button"
                onClick={handleBookAppointment}
                disabled={isBookingSubmitting || !selectedTimeSlot}
                className="w-full py-3.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-98 text-white text-xs sm:text-sm font-extrabold rounded-2xl shadow-md hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBookingSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Confirming Appointment with Hospital...</span>
                  </>
                ) : (
                  <>
                    <span>📅</span>
                    <span>
                      {selectedTimeSlot
                        ? `Book Appointment for ${selectedTimeSlot} (₹${selectedDoctor.fees || 500})`
                        : 'Choose a Time Slot to Book'}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. BOOKING CONFIRMATION MODAL                                            */}
      {/* ========================================================================= */}
      {bookingSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-blue-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-3xl mx-auto shadow-sm">
              ✓
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-900">Appointment Confirmed!</h3>
              <p className="text-xs text-slate-500">
                Your medical consultation is officially reserved on the hospital OPD roster.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Hospital:</span>
                <span className="font-bold text-slate-900">{bookingSuccessModal.hospitalName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Doctor:</span>
                <span className="font-bold text-slate-900">{bookingSuccessModal.docData?.name || selectedDoctor?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Time & Date:</span>
                <span className="font-bold text-blue-700">
                  {bookingSuccessModal.slotTime} on {bookingSuccessModal.slotDate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                  {bookingSuccessModal.status || 'BOOKED'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setBookingSuccessModal(null)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartHospitalSearchBooking;
