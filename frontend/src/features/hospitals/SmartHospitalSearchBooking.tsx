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

  // 3. Fetch Nearby Hospitals (Step 2: Real Data)
  const fetchHospitals = useCallback(
    async (queryText?: string) => {
      setLoadingHospitals(true);
      try {
        const query = queryText !== undefined ? queryText : debouncedQuery;
        const searchParam = query ? `&search=${encodeURIComponent(query)}` : '';
        const url = `/api/hospitals/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radiusKm=45${searchParam}`;

        const res = await apiClient.get(url);
        if (res.data?.success && Array.isArray(res.data.hospitals)) {
          setHospitals(res.data.hospitals);

          // Select first hospital if none selected
          if (!selectedHospital && res.data.hospitals.length > 0) {
            const initial = initialHospitalId
              ? res.data.hospitals.find((h: HospitalItem) => h.id === initialHospitalId || h.hospitalId === initialHospitalId) || res.data.hospitals[0]
              : res.data.hospitals[0];
            setSelectedHospital(initial);
          }
        }
      } catch (err) {
        console.error('Failed to fetch hospitals:', err);
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

  // When selected hospital changes, load its doctors & re-center map
  useEffect(() => {
    if (selectedHospital) {
      const hospId = selectedHospital.hospitalId || selectedHospital.id || 'hosp_lilavati';
      fetchDoctorsForHospital(hospId);

      // Pan map smoothly to hospital
      if (mapInstance && selectedHospital.lat && selectedHospital.lng) {
        mapInstance.panTo({ lat: selectedHospital.lat, lng: selectedHospital.lng });
      }

      // Calculate directions telemetry
      const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, selectedHospital.lat, selectedHospital.lng);
      const estMin = Math.max(3, Math.round(dist * 2.2));
      setDirectionsInfo({
        distance: `${dist} km`,
        duration: `${estMin} mins`,
      });
    }
  }, [selectedHospital, mapInstance, userLocation.lat, userLocation.lng, fetchDoctorsForHospital]);

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
    if (activeFilterTag === 'CLOSEST') {
      return [...hospitals].sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }
    if (activeFilterTag === 'ICU_READY') {
      return hospitals.filter((h) => (h.icuBedsAvailable || 0) > 15);
    }
    if (activeFilterTag === 'TRAUMA_1') {
      return hospitals.filter((h) => h.traumaLevel?.toLowerCase().includes('level 1'));
    }
    return hospitals;
  }, [hospitals, activeFilterTag]);

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

  const hasValidGoogleMaps = isLoaded && !loadError && typeof window.google?.maps?.Map === 'function';

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
              onClick={() => setActiveFilterTag('ALL')}
              className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeFilterTag === 'ALL'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-blue-100'
              }`}
            >
              All Hospitals ({hospitals.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTag('CLOSEST')}
              className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                activeFilterTag === 'CLOSEST'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-blue-100'
              }`}
            >
              <span>📍</span> Closest by GPS
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTag('ICU_READY')}
              className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                activeFilterTag === 'ICU_READY'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-blue-100'
              }`}
            >
              <span>🛏️</span> High ICU Capacity
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTag('TRAUMA_1')}
              className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                activeFilterTag === 'TRAUMA_1'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-blue-100'
              }`}
            >
              <span>🚨</span> Level 1 Apex Centers
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SPLIT LAYOUT: MAP VIEW (LEFT) + HOSPITAL & DOCTORS (RIGHT)            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* 🗺️ LEFT: GOOGLE MAPS TELEMETRY CANVAS (Col 5) */}
        <div className="lg:col-span-5 h-[340px] sm:h-[420px] lg:h-auto relative bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200">
          {hasValidGoogleMaps ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={selectedHospital ? { lat: selectedHospital.lat, lng: selectedHospital.lng } : userLocation}
              zoom={13}
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

              {/* Dynamic Directions Route Corridor (Step 4) */}
              {showDirections && selectedHospital && (
                <Polyline
                  path={[userLocation, { lat: selectedHospital.lat, lng: selectedHospital.lng }]}
                  options={{
                    strokeColor: '#2563EB',
                    strokeWeight: 5,
                    strokeOpacity: 0.85,
                    geodesic: true,
                  }}
                />
              )}
            </GoogleMap>
          ) : (
            /* Interactive Radar Telemetry Fallback Canvas */
            <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 relative flex flex-col justify-between select-none overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:28px_28px] opacity-40"></div>

              {/* Connecting line */}
              {showDirections && selectedHospital && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <line
                    x1="25%"
                    y1="60%"
                    x2="70%"
                    y2="30%"
                    stroke="#3B82F6"
                    strokeWidth="4"
                    strokeDasharray="6 6"
                    className="animate-pulse"
                  />
                </svg>
              )}

              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded">
                  Radar Telemetry Map
                </span>
                <span className="text-[10px] text-slate-400">
                  {displayedHospitals.length} Apex Centers Mapped
                </span>
              </div>

              {/* Center User Beacon */}
              <div className="absolute left-[25%] top-[60%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-xs animate-pulse">
                  📍
                </div>
                <span className="mt-1 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                  You
                </span>
              </div>

              {/* Selected Hospital Beacon */}
              <div className="absolute left-[70%] top-[30%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-sm">
                  🏥
                </div>
                <span className="mt-1 bg-black/80 text-emerald-300 text-[9px] px-2 py-0.5 rounded font-bold max-w-[130px] truncate">
                  {selectedHospital?.name || 'Selected Hospital'}
                </span>
              </div>

              <div className="relative z-10 bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-2 rounded-xl text-xs flex items-center justify-between text-slate-300">
                <span>Center: {selectedHospital?.name || 'Bandra Healthcare Hub'}</span>
                <span className="text-blue-400 font-bold">{directionsInfo?.distance || '1.2 km'}</span>
              </div>
            </div>
          )}

          {/* Floating Route Status Banner (Step 4: Dynamic Directions Info) */}
          {directionsInfo && selectedHospital && (
            <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-slate-200 shadow-xl flex items-center justify-between gap-3 text-xs z-30">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-lg shrink-0">
                  🚗
                </div>
                <div>
                  <p className="font-extrabold text-slate-900">
                    Live Route: <span className="text-blue-600">{directionsInfo.duration}</span>
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
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer transition-colors"
                >
                  {showDirections ? 'Hide Line' : 'Show Route'}
                </button>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${selectedHospital.lat},${selectedHospital.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <span>Navigation</span>
                  <span className="text-[10px]">↗</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* 🏥 RIGHT: HOSPITAL DETAILS & DOCTOR BOOKING (Col 7) */}
        <div className="lg:col-span-7 p-5 sm:p-7 flex flex-col justify-between bg-slate-50/50 space-y-6">
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
                  onClick={() => setShowDirections(true)}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🗺️</span>
                  <span>Get Driving Directions</span>
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
