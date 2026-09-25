import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { useApp } from '../../context/AppContext';
import DashboardNavbar from '../../components/DashboardNavbar';
import { LiveMap } from '../../features/maps/LiveMap';
import { useLiveLocation } from '../../features/tracking/useLiveLocation';
import { EmergencySOSModal } from '../../components/EmergencySOSModal';
import { DoctorItem } from '../../assets/assets';
import { socketService } from '../../services/socket';
import soundService from '../../services/soundService';
import DigitalPrescriptionModal, { PrescriptionData } from '../../components/DigitalPrescriptionModal';
import AiTriageModal from '../../features/triage/AiTriageModal';
import SmartHospitalSearchBooking from '../../features/hospitals/SmartHospitalSearchBooking';

interface HospitalInfo {
  id: string;
  _id?: string;
  name: string;
  address: string;
  traumaLevel?: string;
  totalBeds?: number;
  icuBedsAvailable?: number;
  contactPhone?: string;
  phone?: string;
  emergencyContact?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  estimatedDriveMinutes?: number;
  rating?: number;
  doctorsCount?: number;
  specialities?: string[];
}

export const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { userData, token, showToast, doctors, getDoctorsData, refreshVersion } = useApp();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [ambulanceBookings, setAmbulanceBookings] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<HospitalInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSpeciality, setSelectedSpeciality] = useState<string>('All');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'consultations' | 'ambulance'>('consultations');
  const [isSOSModalOpen, setIsSOSModalOpen] = useState<boolean>(false);
  const [isTriageOpen, setIsTriageOpen] = useState<boolean>(false);
  const [prescriptionModalData, setPrescriptionModalData] = useState<PrescriptionData | null>(null);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [driverAcceptedNotice, setDriverAcceptedNotice] = useState<string | null>(null);
  
  // Geolocation & Nearest Hospital State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: 19.0760, lng: 72.8777 });
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [nearestHospital, setNearestHospital] = useState<HospitalInfo | null>(null);

  const [activeSection, setActiveSection] = useState<'hospitals' | 'doctors' | 'appointments' | 'emergency'>('hospitals');
  const [profileDoc, setProfileDoc] = useState<DoctorItem | null>(null);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState<string>('');
  const [bookingDoc, setBookingDoc] = useState<DoctorItem | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('');
  const [consultationType, setConsultationType] = useState<'IN_CLINIC' | 'VIDEO'>('IN_CLINIC');
  const [patientNotes, setPatientNotes] = useState<string>('');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState<boolean>(false);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [showLiveTracking, setShowLiveTracking] = useState<boolean>(false);

  const patientName = userData?.name || 'Edward Vincent';

  // 🚑 Live Real-time Ambulance Telemetry Hook
  const {
    currentLocation: driverLocation,
    pickupLocation,
    trackingStatus,
    etaMinutes,
    distanceKm,
  } = useLiveLocation({
    role: 'patient',
    patientId: userData?._id || 'user_edward_101',
    driverId: 'driver_108',
    bookingId: 'SOS-108992',
    autoWatchGps: true,
  });

  // Calculate 7-day upcoming slot dates
  const next7Days = useMemo(() => {
    const days: { label: string; dateStr: string; dayName: string; dateObj: Date }[] = [];
    const today = new Date();
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayNum = d.getDate();
      const monthNum = d.getMonth() + 1;
      const yearNum = d.getFullYear();
      const dateStr = `${dayNum}_${monthNum}_${yearNum}`;
      
      let label = `${dayNames[d.getDay()]} ${dayNum}`;
      if (i === 0) label = `Today (${dayNum})`;
      if (i === 1) label = `Tomorrow (${dayNum})`;

      days.push({
        label,
        dateStr,
        dayName: dayNames[d.getDay()],
        dateObj: d,
      });
    }
    return days;
  }, []);

  const timeOptions = [
    '10:00 am',
    '10:30 am',
    '11:00 am',
    '11:30 am',
    '12:00 pm',
    '12:30 pm',
    '04:30 pm',
    '05:00 pm',
    '05:30 pm',
    '06:00 pm',
    '06:30 pm',
    '07:00 pm',
    '07:30 pm',
    '08:00 pm',
  ];

  // Fetch Hospitals list with distance calculation
  const fetchHospitalsList = useCallback(async (coords?: { lat: number; lng: number }) => {
    try {
      const lat = coords?.lat || userCoords.lat;
      const lng = coords?.lng || userCoords.lng;
      const res = await apiClient.get(`/api/hospitals/nearby?lat=${lat}&lng=${lng}&radiusKm=50`);
      
      if (res.data?.success && Array.isArray(res.data.hospitals) && res.data.hospitals.length > 0) {
        setHospitals(res.data.hospitals);
        setNearestHospital(res.data.hospitals[0]);
      } else {
        const fallbackRes = await apiClient.get('/api/hospitals');
        if (fallbackRes.data?.success && Array.isArray(fallbackRes.data.hospitals)) {
          setHospitals(fallbackRes.data.hospitals);
          setNearestHospital(fallbackRes.data.hospitals[0] || null);
        }
      }
    } catch {
      // Graceful fallback
    }
  }, [userCoords]);

  // GPS Auto-detect Nearest Hospital
  const detectNearestHospital = () => {
    setIsLocating(true);
    showToast('📍 Accessing GPS to identify closest hospital...', 'info');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(coords);
          fetchHospitalsList(coords);
          setIsLocating(false);
          showToast('✓ GPS Location updated! Nearest hospitals recalculated.', 'success');
        },
        () => {
          // Default to Mumbai Central coordinates
          const defaultCoords = { lat: 19.0522, lng: 72.8295 };
          setUserCoords(defaultCoords);
          fetchHospitalsList(defaultCoords);
          setIsLocating(false);
          showToast('📍 Using City Center GPS coordinates.', 'info');
        },
        { timeout: 8000 }
      );
    } else {
      setIsLocating(false);
      fetchHospitalsList();
    }
  };

  // Fetch patient appointments, ambulance bookings, and doctor roster
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔄 [Patient Dashboard] Fetching appointments & bookings from DB...');
      const authToken = token || sessionStorage.getItem('token') || localStorage.getItem('token') || '';
      
      // 1. Fetch Doctor Appointments
      if (authToken) {
        const aptRes = await apiClient.get('/api/user/appointments');
        if (aptRes.data?.success && Array.isArray(aptRes.data.appointments)) {
          setAppointments(aptRes.data.appointments);
        } else {
          setAppointments([]);
        }

        // 2. Fetch Ambulance Bookings
        const ambRes = await apiClient.get('/api/bookings/my-bookings');
        if (ambRes.data?.success && Array.isArray(ambRes.data.bookings)) {
          setAmbulanceBookings(ambRes.data.bookings);
        } else {
          setAmbulanceBookings([]);
        }
      }

      // 3. Sync Doctor Roster
      await getDoctorsData();

      // 4. Fetch Hospitals
      await fetchHospitalsList();
    } catch (e: any) {
      console.error('❌ [Patient Dashboard Fetch Error]', e.message);
    } finally {
      setLoading(false);
    }
  }, [token, getDoctorsData, fetchHospitalsList]);

  useEffect(() => {
    fetchDashboardData();

    // 🔔 Real-time Socket.IO Subscriptions for Patient
    const patientId = userData?._id || 'user_edward_101';
    socketService.connect();
    socketService.joinPatient(patientId);

    const unsubCleared = socketService.onDataCleared(() => {
      setAppointments([]);
      setAmbulanceBookings([]);
      fetchDashboardData();
    });

    const unsubAccepted = socketService.onRideAccepted((data: any) => {
      const driverName = data?.driverName || data?.booking?.driverName || 'Paramedic Unit';
      const noticeText = 'Driver accepted your request';
      setDriverAcceptedNotice(`${noticeText} (${driverName})`);
      showToast(`🚑 ${noticeText}! Ambulance en route to your location.`, 'success');
      fetchDashboardData();
    });

    const unsubNewAppt = socketService.onNewAppointment(() => {
      fetchDashboardData();
    });

    const unsubNewBooking = socketService.onNewBooking(() => {
      fetchDashboardData();
    });

    const unsubApptUpdated = socketService.onAppointmentUpdated(() => {
      fetchDashboardData();
    });

    const unsubApptCancelled = socketService.onAppointmentCancelled(() => {
      fetchDashboardData();
    });

    const unsubRideStatus = socketService.onRideStatusUpdate(() => {
      fetchDashboardData();
    });

    return () => {
      if (typeof unsubCleared === 'function') unsubCleared();
      if (typeof unsubAccepted === 'function') unsubAccepted();
      if (typeof unsubNewAppt === 'function') unsubNewAppt();
      if (typeof unsubNewBooking === 'function') unsubNewBooking();
      if (typeof unsubApptUpdated === 'function') unsubApptUpdated();
      if (typeof unsubApptCancelled === 'function') unsubApptCancelled();
      if (typeof unsubRideStatus === 'function') unsubRideStatus();
    };
  }, [token, userData?._id, refreshVersion, fetchDashboardData]);

  // Filter specialities
  const specialities = [
    'All',
    'General physician',
    'Gynecologist',
    'Dermatologist',
    'Pediatricians',
    'Neurologist',
    'Gastroenterologist',
  ];

  // Active selected hospital object
  const activeHospital = useMemo(() => {
    if (selectedHospitalId === 'ALL') return null;
    return hospitals.find((h) => (h.id === selectedHospitalId || h._id === selectedHospitalId));
  }, [hospitals, selectedHospitalId]);

  // Filter doctors by selected speciality, search query AND selected hospital
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      // 1. Specialty filter
      const matchesSpeciality =
        selectedSpeciality === 'All' ||
        doc.speciality?.toLowerCase() === selectedSpeciality.toLowerCase();

      // 2. Search query filter
      const q = doctorSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        doc.name?.toLowerCase().includes(q) ||
        doc.speciality?.toLowerCase().includes(q) ||
        (doc as any).hospitalName?.toLowerCase().includes(q) ||
        doc.degree?.toLowerCase().includes(q);

      // 3. Hospital filter
      let matchesHospital = true;
      if (selectedHospitalId !== 'ALL') {
        const docHospId = (doc as any).hospitalId || 'hosp_lilavati';
        matchesHospital =
          docHospId === selectedHospitalId ||
          selectedHospitalId === 'hosp_lilavati' ||
          (activeHospital?.name && doc.name && true);
      }

      return matchesSpeciality && matchesSearch && matchesHospital;
    });
  }, [doctors, selectedSpeciality, doctorSearchQuery, selectedHospitalId, activeHospital]);

  // Handle In-Dashboard Direct Doctor Booking
  const handleConfirmAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      showToast('Please login to book a doctor appointment', 'info');
      navigate('/login');
      return;
    }

    if (!bookingDoc) return;

    if (!selectedSlotTime) {
      showToast('Please select a convenient time slot', 'error');
      return;
    }

    const chosenSlotDate = next7Days[selectedSlotIndex].dateStr;
    const targetHospitalId = selectedHospitalId !== 'ALL' ? selectedHospitalId : ((bookingDoc as any).hospitalId || 'hosp_lilavati');

    try {
      setIsBookingSubmitting(true);
      const res = await apiClient.post('/api/user/book-appointment', {
        docId: bookingDoc._id,
        slotDate: chosenSlotDate,
        slotTime: selectedSlotTime,
        hospitalId: targetHospitalId,
      });

      if (res.data?.success) {
        soundService.playSuccessChime();
        showToast(`✓ Appointment with ${bookingDoc.name} booked successfully at ${activeHospital?.name || 'Lilavati Hospital'}!`, 'success');
        setBookingDoc(null);
        setSelectedSlotTime('');
        setPatientNotes('');
        await getDoctorsData();
        await fetchDashboardData();
      } else {
        showToast(res.data?.message || 'Slot unavailable. Please pick another time.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to book appointment', 'error');
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  // Derive active appointment and upcoming consultations
  const activeAppointment = appointments.find((a) => !a.cancelled && !a.isCompleted) || appointments[0];
  const activeAmbulance = ambulanceBookings.find((b) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED') || null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-20 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Universal Clean Navbar */}
      <DashboardNavbar
        currentRole="PATIENT"
        userName={patientName}
        userSubtitle="Patient ID: #PT-10024"
        avatarUrl={userData?.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-7">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER SECTION (Greeting, Vitals, Notification & Quick SOS)       */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200/60">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                Patient Health Command
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200/60">
                ✓ Medical ID Verified
              </span>
              {nearestHospital && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200/60">
                  📍 Nearest: {nearestHospital.name.split(' ')[0]} ({nearestHospital.distanceKm ? `${nearestHospital.distanceKm} km` : '1.2 km'})
                </span>
              )}
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Hello, {patientName} 👋
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl font-normal">
              Select your preferred or nearest partner hospital, consult verified specialists, and manage emergency ambulance dispatch.
            </p>
          </div>

          {/* Right Header Action Hub */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            {/* 🤖 Smart AI Symptom Triage CTA Button */}
            <button
              type="button"
              onClick={() => setIsTriageOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-98 text-white text-xs font-black rounded-xl shadow-sm hover:shadow-indigo-500/25 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="text-sm">🤖</span>
              <span>AI Symptom Triage</span>
            </button>

            {/* Notification Bell Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  showToast('Notification center synced.', 'info');
                }}
                className="w-11 h-11 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 hover:text-blue-600 transition-all relative cursor-pointer"
                title="Notifications"
              >
                <span className="text-lg">🔔</span>
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-600 rounded-full ring-2 ring-white"></span>
              </button>

              {/* Notification Popover Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 text-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-900">Notifications</span>
                    <span className="text-[10px] text-blue-600 font-semibold cursor-pointer" onClick={() => setShowNotifications(false)}>Close ✕</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                      <p className="font-bold text-blue-900">24/7 Ambulance Dispatch Online</p>
                      <p className="text-[11px] text-slate-600">Lilavati Hospital Trauma Unit is on standby with 14 available ICU beds.</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="font-bold text-slate-800">Teleconsultation Ready</p>
                      <p className="text-[11px] text-slate-500">You can book appointments with top certified physicians anytime.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. PRIMARY PATIENT NAVIGATION TABS (Dedicated Portal Tabs)                */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto select-none">
          <button
            type="button"
            onClick={() => setActiveSection('hospitals')}
            className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeSection === 'hospitals'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="text-base">🏥</span>
            <span>Hospitals & GPS Map</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                activeSection === 'hospitals' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {hospitals.length || 7}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('doctors')}
            className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeSection === 'doctors'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="text-base">👨‍⚕️</span>
            <span>Verified Specialists</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                activeSection === 'doctors' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {filteredDoctors.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('appointments')}
            className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeSection === 'appointments'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="text-base">📋</span>
            <span>My Consultations</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                activeSection === 'appointments' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {appointments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('emergency')}
            className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeSection === 'emergency'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/20'
                : 'text-slate-600 hover:text-red-600 hover:bg-red-50/50'
            }`}
          >
            <span className="text-base animate-pulse">🚨</span>
            <span>Emergency SOS 108</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeSection === 'emergency' ? 'bg-white/20 text-white' : 'bg-red-50 text-red-700'
              }`}
            >
              LIVE
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: 🏥 SMART HOSPITALS & LIVE ROUTE NAVIGATION (Google Maps + Radar)   */}
        {/* ========================================================================= */}
        {activeSection === 'hospitals' && (
          <section id="hospital-selection-section" className="space-y-4 animate-in fade-in duration-200">
            <SmartHospitalSearchBooking
              initialHospitalId={selectedHospitalId !== 'ALL' ? selectedHospitalId : undefined}
              onAppointmentBooked={() => {
                fetchDashboardData();
                getDoctorsData();
              }}
            />
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: 👨‍⚕️ VERIFIED SPECIALISTS ROSTER & POPUP BOOKING                    */}
        {/* ========================================================================= */}
        {activeSection === 'doctors' && (
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6 animate-in fade-in duration-200">
            {/* Header with Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
                  <span>👨‍⚕️</span> Verified Medical Specialists
                  {activeHospital && (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      at {activeHospital.name.split(' ')[0]}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Book instant online or in-clinic doctor consultations at your selected partner hospital.
                </p>
              </div>

              {/* Search input box */}
              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <input
                    type="text"
                    value={doctorSearchQuery}
                    onChange={(e) => setDoctorSearchQuery(e.target.value)}
                    placeholder="Search doctor, specialty..."
                    className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                  {doctorSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDoctorSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSpeciality('All');
                    setDoctorSearchQuery('');
                  }}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Specialty Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
              {specialities.map((spec) => (
                <button
                  key={spec}
                  onClick={() => setSelectedSpeciality(spec)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedSpeciality === spec
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-102'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>

            {/* Doctors Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 animate-pulse space-y-4">
                    <div className="w-full h-40 bg-slate-200 rounded-xl"></div>
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-9 bg-slate-200 rounded-xl"></div>
                  </div>
                ))
              ) : filteredDoctors.length > 0 ? (
                filteredDoctors.map((doc: DoctorItem) => (
                  <div
                    key={doc._id}
                    className="group bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 p-5 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="space-y-3.5">
                      {/* Doctor Image Container */}
                      <div
                        onClick={() => setProfileDoc(doc)}
                        className="relative h-48 rounded-xl overflow-hidden bg-gradient-to-b from-blue-50 to-indigo-50/60 border border-slate-100 cursor-pointer"
                      >
                        <img
                          src={doc.image}
                          alt={doc.name}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full text-xs font-black text-slate-800 shadow-xs border border-slate-100">
                          ${doc.fees}
                        </span>
                        <span className="absolute bottom-2.5 left-2.5 bg-emerald-500/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                          Available
                        </span>
                      </div>

                      {/* Doctor Details */}
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <h3
                            onClick={() => setProfileDoc(doc)}
                            className="text-base font-bold text-[#0F172A] group-hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            {doc.name}
                          </h3>
                        </div>

                        <p className="text-xs font-semibold text-blue-600 mt-0.5">
                          {doc.speciality} • {doc.degree || 'MBBS, MD'}
                        </p>

                        {/* Hospital Affiliation Badge */}
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 max-w-full">
                          <span>🏥</span>
                          <span className="line-clamp-1">{doc.hospitalName || 'Lilavati Hospital & Research Centre'}</span>
                        </div>

                        <p className="text-[11px] text-[#64748B] mt-1.5 line-clamp-2">
                          {doc.about || `${doc.experience} of clinical excellence in patient healthcare.`}
                        </p>
                      </div>
                    </div>

                    {/* Booking & Profile Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-[#64748B]">
                        <span className="text-amber-500 font-bold">4.9 ★</span> • {doc.experience}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setBookingDoc(doc);
                            setSelectedSlotIndex(0);
                            setSelectedSlotTime(timeOptions[0]);
                          }}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <span>Appoint</span>
                          <span>📅</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileDoc(doc)}
                          className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="View Doctor Profile & Bio Popup"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-[#64748B] bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <span className="text-3xl block">👨‍⚕️</span>
                  <p className="text-sm font-semibold text-[#0F172A]">No specialists found in this category.</p>
                  <p className="text-xs text-[#64748B]">Try selecting "All" or reset your search filters.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSpeciality('All');
                      setDoctorSearchQuery('');
                      setSelectedHospitalId('ALL');
                    }}
                    className="mt-2 px-4 py-1.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: 📋 RECENT ACTIVITY (Consultation History & Ambulance Logs)         */}
        {/* ========================================================================= */}
        {activeSection === 'appointments' && (
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                  <span>📋</span> My Consultations & History
                </h2>
                <p className="text-xs text-[#64748B]">Review your scheduled doctor appointments and emergency ambulance logs</p>
              </div>

              {/* Sub-Tab Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('consultations')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'consultations'
                      ? 'bg-white text-[#0F172A] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Doctor Consultations ({appointments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ambulance')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'ambulance'
                      ? 'bg-white text-[#0F172A] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Ambulance Runs ({ambulanceBookings.length})
                </button>
              </div>
            </div>

            {/* Tab 1: Doctor Consultations History */}
            {activeTab === 'consultations' && (
              <div className="divide-y divide-slate-100">
                {appointments && appointments.length > 0 ? (
                  appointments.map((item: any, idx: number) => (
                    <div key={item._id || idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.docData?.image || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300'}
                          alt={item.docData?.name || 'Doctor'}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-[#0F172A]">{item.docData?.name || 'Doctor'}</p>
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                              🏥 {item.hospitalName || item.docData?.hospitalName || 'Lilavati Hospital'}
                            </span>
                          </div>
                          <p className="text-xs text-[#64748B]">
                            {item.docData?.speciality} • Slot: <span className="text-blue-700 font-semibold">{item.slotDate?.replace(/_/g, ' / ')} at {item.slotTime}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">${item.amount || 50}</span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            item.isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.cancelled
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {item.isCompleted ? 'Completed ✓' : item.cancelled ? 'Cancelled' : 'Confirmed'}
                        </span>
                        {/* 📄 View Medical Pass & Rx Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setPrescriptionModalData({
                              appointmentId: item._id || 'APT-' + idx,
                              patientName: patientName,
                              patientAge: 28,
                              patientGender: 'Male',
                              doctorName: item.docData?.name || 'Dr. Richard James',
                              doctorSpeciality: item.docData?.speciality || 'General Physician',
                              hospitalName: item.hospitalName || item.docData?.hospitalName || 'Lilavati Hospital & Research Centre',
                              slotDate: item.slotDate?.replace(/_/g, ' / ') || 'Today',
                              slotTime: item.slotTime || '10:00 am',
                              fees: item.amount || 50,
                            });
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                          title="View & Print Official Medical Slip & Prescription"
                        >
                          <span>📄</span> Rx Pass
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-[#64748B] space-y-2">
                    <span className="text-3xl block">📋</span>
                    <p className="text-xs font-semibold text-[#0F172A]">No consultation history recorded yet.</p>
                    <p className="text-[11px] text-[#64748B]">Your completed doctor appointments will be logged here.</p>
                    <button
                      type="button"
                      onClick={() => setActiveSection('doctors')}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-blue-700 cursor-pointer transition-colors"
                    >
                      Book A Consultation →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Ambulance Dispatch History */}
            {activeTab === 'ambulance' && (
              <div className="divide-y divide-slate-100">
                {ambulanceBookings && ambulanceBookings.length > 0 ? (
                  ambulanceBookings.map((trip: any, idx: number) => (
                    <div key={trip._id || idx} className="py-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                              {trip.vehicleNumber || 'MH-01-EQ-1108'}
                            </span>
                            <h4 className="text-sm font-bold text-[#0F172A]">
                              {trip.destinationHospital?.name || (typeof trip.destinationHospital === 'string' ? trip.destinationHospital : trip.hospitalName || 'Lilavati Hospital Trauma Center')}
                            </h4>
                          </div>
                          <p className="text-xs text-[#64748B]">
                            Paramedic: {trip.driverName || 'Rajesh Kumar'} • Condition: {trip.patientCondition || 'Emergency SOS'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setExpandedTripId(expandedTripId === (trip._id || idx) ? null : (trip._id || idx))}
                            className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <span>🗺️ {expandedTripId === (trip._id || idx) ? 'Hide Telemetry' : 'Track Route'}</span>
                          </button>

                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                            {trip.status || 'COMPLETED'}
                          </span>
                        </div>
                      </div>

                      {expandedTripId === (trip._id || idx) && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 shadow-xs animate-in fade-in duration-200">
                          <LiveMap
                            latitude={trip.currentLocation?.lat || 19.0522}
                            longitude={trip.currentLocation?.lng || 72.8295}
                            pickupLat={trip.pickupLocation?.lat || 19.0600}
                            pickupLng={trip.pickupLocation?.lng || 72.8340}
                            bookingId={trip._id || trip.bookingId || 'SOS-108'}
                            patientId={userData?._id || 'user_edward_101'}
                            vehicleNumber={trip.vehicleNumber || 'MH-01-EQ-1108'}
                            driverName={trip.driverName || 'Rajesh Kumar'}
                            status={trip.status || 'COMPLETED'}
                            height="240px"
                          />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-[#64748B] space-y-2">
                    <span className="text-3xl block">🚑</span>
                    <p className="text-xs font-semibold text-[#0F172A]">No ambulance dispatch history recorded.</p>
                    <p className="text-[11px] text-[#64748B]">Emergency 108 trips and transit logs will appear here.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: 🚨 EMERGENCY SOS 108 & LIVE GPS TELEMETRY MAP                      */}
        {/* ========================================================================= */}
        {activeSection === 'emergency' && (
          <section className="space-y-6 animate-in fade-in duration-200">
            {/* SOS Dispatch Action Card */}
            <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-extrabold">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  <span>24/7 Apex Emergency Command Active</span>
                </div>
                <h3 className="text-2xl font-black">1-Tap GPS Emergency Ambulance Dispatch</h3>
                <p className="text-xs text-red-100 max-w-xl">
                  Dispatches closest ALS/BLS ambulance equipped with ICU ventilators and paramedic staff directly to your live GPS coordinates.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSOSModalOpen(true)}
                className="px-6 py-3.5 bg-white text-red-700 hover:bg-red-50 active:scale-95 text-sm font-black rounded-2xl shadow-xl transition-all cursor-pointer flex items-center gap-2 shrink-0"
              >
                <span className="text-xl">🚨</span>
                <span>Trigger Emergency SOS</span>
              </button>
            </div>

            {/* Live GPS Telemetry Radar Map */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-red-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center text-2xl font-bold shadow-md shadow-red-500/20">
                    🚑
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-[#0F172A]">
                        Live Ambulance GPS Radar Telemetry (Uber/Porter Mode)
                      </h3>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 uppercase">
                        {activeAmbulance?.status || 'EN ROUTE TO PICKUP'}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Paramedic: <strong className="text-slate-800">{activeAmbulance?.driverName || 'Rajesh Kumar'}</strong> ({activeAmbulance?.driverPhone || '+91 98201 10800'}) • Unit: <span className="font-mono font-bold text-red-600">{activeAmbulance?.vehicleNumber || 'MH-01-EQ-1108'}</span>
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  60fps Live Telemetry (Zero Jump)
                </span>
              </div>

              {/* Dynamic Map */}
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
                <LiveMap
                  latitude={driverLocation?.latitude || activeAmbulance?.currentLocation?.lat || 19.0522}
                  longitude={driverLocation?.longitude || activeAmbulance?.currentLocation?.lng || 72.8295}
                  pickupLat={userCoords.lat || 19.0600}
                  pickupLng={userCoords.lng || 72.8340}
                  bookingId={activeAmbulance?._id || activeAmbulance?.bookingId || 'SOS-108'}
                  patientId={userData?._id || 'user_edward_101'}
                  vehicleNumber={activeAmbulance?.vehicleNumber || 'MH-01-EQ-1108'}
                  driverName={activeAmbulance?.driverName || 'Rajesh Kumar'}
                  driverPhone={activeAmbulance?.driverPhone || '+91 98201 10800'}
                  status={activeAmbulance?.status || 'EN ROUTE TO PICKUP'}
                  height="360px"
                />
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 5B. DOCTOR PROFILE & CREDENTIALS DETAILS POPUP MODAL                      */}
      {/* ========================================================================= */}
      {profileDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header with Doctor Picture & Verified Badge */}
            <div className="p-6 bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-900 text-white flex items-start justify-between relative">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <img
                    src={profileDoc.image}
                    alt={profileDoc.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/60 shadow-lg"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white">
                    VERIFIED ✓
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-white">{profileDoc.name}</h3>
                  <p className="text-xs text-blue-200 font-semibold">{profileDoc.speciality} • {profileDoc.degree || 'MBBS, MD'}</p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-xs font-bold text-amber-300">★ 4.9</span>
                    <span className="text-blue-300 text-xs">•</span>
                    <span className="text-xs text-blue-100">{profileDoc.experience || '4+ Years Experience'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setProfileDoc(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Key Indicators Bar */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Consult Fee</p>
                  <p className="text-sm font-black text-blue-600 mt-0.5">${profileDoc.fees || 50}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Patients</p>
                  <p className="text-sm font-black text-emerald-600 mt-0.5">1,200+</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Status</p>
                  <p className="text-sm font-black text-emerald-700 mt-0.5">Available</p>
                </div>
              </div>

              {/* Hospital Affiliation Info */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-blue-900 text-xs">🏥 Partner Hospital Wing</span>
                  <span className="text-[10px] bg-white text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                    Apex Center
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800">
                  {profileDoc.hospitalName || activeHospital?.name || 'Lilavati Hospital & Research Centre'}
                </p>
                <p className="text-[11px] text-slate-600">
                  {activeHospital?.address || 'Bandra Reclamation, Bandra West, Mumbai 400050'}
                </p>
              </div>

              {/* About & Clinical Focus */}
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">About Doctor & Clinical Focus</h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  {profileDoc.about ||
                    `${profileDoc.name} is a certified medical specialist in ${profileDoc.speciality} with extensive hospital practice in patient care, diagnostic analysis, and preventive healthcare.`}
                </p>
              </div>

              {/* Registration and Compliance */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
                <span>Medical Council Reg: <strong className="text-slate-800">#MCI-{(profileDoc._id || '98231').slice(-6).toUpperCase()}</strong></span>
                <span className="text-emerald-700 font-bold">Verified Practitioner ✓</span>
              </div>
            </div>

            {/* Modal Footer CTA */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setProfileDoc(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const doc = profileDoc;
                  setProfileDoc(null);
                  setBookingDoc(doc);
                  setSelectedSlotIndex(0);
                  setSelectedSlotTime(timeOptions[0]);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Book Consultation</span>
                <span>📅 →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. QUICK IN-DASHBOARD APPOINTMENT BOOKING MODAL                          */}
      {/* ========================================================================= */}
      {bookingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={bookingDoc.image}
                  alt={bookingDoc.name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-white/40 shadow-sm"
                />
                <div>
                  <h3 className="text-base font-bold">{bookingDoc.name}</h3>
                  <p className="text-xs text-blue-100">{bookingDoc.speciality} • Fee: ${bookingDoc.fees}</p>
                </div>
              </div>

              <button
                onClick={() => setBookingDoc(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmAppointment} className="p-6 overflow-y-auto space-y-5">
              {/* Hospital Location Summary */}
              <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-blue-900 block">
                    🏥 {activeHospital?.name || bookingDoc.hospitalName || 'Lilavati Hospital & Research Centre'}
                  </span>
                  <span className="text-[11px] text-slate-600">
                    {activeHospital?.address || 'Bandra Reclamation, Bandra West, Mumbai'}
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-white rounded-lg text-blue-700 font-bold border border-blue-200 text-[11px]">
                  Verified Hospital
                </span>
              </div>

              {/* 1. Date Slot Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>📅</span> Select Appointment Day (7-Day Schedule)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {next7Days.map((day, idx) => (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => setSelectedSlotIndex(idx)}
                      className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                        selectedSlotIndex === idx
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <p className="text-[10px] uppercase font-semibold">{day.dayName}</p>
                      <p className="text-xs font-bold mt-0.5">{day.dateObj.getDate()}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Time Slot Chips */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>⏰</span> Select Time Slot
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                  {timeOptions.map((timeStr) => {
                    const isSelected = selectedSlotTime === timeStr;
                    return (
                      <button
                        key={timeStr}
                        type="button"
                        onClick={() => setSelectedSlotTime(timeStr)}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold text-center border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {timeStr}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Consultation Mode */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800">Consultation Format</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConsultationType('IN_CLINIC')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      consultationType === 'IN_CLINIC'
                        ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">🏥 In-Clinic Hospital Visit</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Physical consultation at hospital wing</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConsultationType('VIDEO')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      consultationType === 'VIDEO'
                        ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">📹 Video Telehealth</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Online secure video consultation</p>
                  </button>
                </div>
              </div>

              {/* 4. Notes Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">Primary Symptoms / Notes (Optional)</label>
                <textarea
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  placeholder="e.g. Mild fever, routine health checkup, previous prescription review..."
                  rows={2}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Confirm Action Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBookingDoc(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBookingSubmitting || !selectedSlotTime}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isBookingSubmitting ? (
                    <span>Confirming Appointment...</span>
                  ) : (
                    <>
                      <span>Confirm & Book Appointment</span>
                      <span>✓</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emergency SOS Modal (Interactive 1-Tap Trigger) */}
      <EmergencySOSModal
        isOpen={isSOSModalOpen}
        onClose={() => {
          setIsSOSModalOpen(false);
          fetchDashboardData();
        }}
      />

      {/* 🤖 Smart AI Medical Triage Assistant Modal */}
      <AiTriageModal
        isOpen={isTriageOpen}
        onClose={() => setIsTriageOpen(false)}
        onTriggerSOS={() => {
          setIsSOSModalOpen(true);
        }}
        onBookDoctor={(spec) => {
          setSelectedSpeciality(spec);
          const el = document.getElementById('hospital-selection-section');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 📄 Official Digital Prescription & Medical Pass Modal */}
      <DigitalPrescriptionModal
        isOpen={Boolean(prescriptionModalData)}
        onClose={() => setPrescriptionModalData(null)}
        data={prescriptionModalData}
      />
    </div>
  );
};

export default PatientDashboard;
