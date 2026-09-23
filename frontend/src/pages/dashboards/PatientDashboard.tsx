import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../../context/AppContext';
import DashboardNavbar from '../../components/DashboardNavbar';
import { LiveMap } from '../../features/maps/LiveMap';
import { useLiveLocation } from '../../features/tracking/useLiveLocation';
import { EmergencySOSModal } from '../../components/EmergencySOSModal';
import { DoctorItem } from '../../assets/assets';

export const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { userData, token, backendUrl, showToast, doctors, getDoctorsData } = useApp();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [ambulanceBookings, setAmbulanceBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSpeciality, setSelectedSpeciality] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'consultations' | 'ambulance'>('consultations');
  const [isSOSModalOpen, setIsSOSModalOpen] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  const patientName = userData?.name || 'Edward Vincent';
  const apiBase = backendUrl || 'http://localhost:5000';

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

  // Fetch patient appointments, ambulance bookings, and doctor roster
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const authToken = token || sessionStorage.getItem('token') || localStorage.getItem('token') || '';
      
      // 1. Fetch Doctor Appointments
      if (authToken) {
        const aptRes = await axios.get(`${apiBase}/api/user/appointments`, {
          headers: { token: authToken, Authorization: `Bearer ${authToken}` },
        });
        if (aptRes.data?.success && Array.isArray(aptRes.data.appointments)) {
          setAppointments(aptRes.data.appointments);
        }

        // 2. Fetch Ambulance Bookings
        const ambRes = await axios.get(`${apiBase}/api/bookings/my-bookings`, {
          headers: { token: authToken, Authorization: `Bearer ${authToken}` },
        });
        if (ambRes.data?.success && Array.isArray(ambRes.data.bookings)) {
          setAmbulanceBookings(ambRes.data.bookings);
        }
      }

      // 3. Sync Doctor Roster
      await getDoctorsData();
    } catch (e) {
      // Graceful error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token, apiBase]);

  // Filter doctors by selected speciality
  const specialities = [
    'All',
    'General physician',
    'Gynecologist',
    'Dermatologist',
    'Pediatricians',
    'Neurologist',
    'Gastroenterologist',
  ];

  const filteredDoctors =
    selectedSpeciality === 'All'
      ? doctors
      : doctors.filter((doc) => doc.speciality?.toLowerCase() === selectedSpeciality.toLowerCase());

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
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Hello, {patientName} 👋
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl font-normal">
              How are you feeling today? Access instant emergency dispatch, browse verified medical specialists, and manage your health records.
            </p>
          </div>

          {/* Right Header Action Hub */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
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

            {/* Quick Consultation CTA */}
            <button
              onClick={() => navigate('/doctors')}
              className="px-4 sm:px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-98 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>+ Book Doctor</span>
              <span className="text-sm">→</span>
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. QUICK ACTION CARDS (MAIN HERO SECTION)                                */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Quick Medical Actions
            </h2>
            <span className="text-xs text-[#64748B]">Instant Access</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Book Doctor */}
            <div
              onClick={() => navigate('/doctors')}
              className="group relative bg-white hover:bg-gradient-to-br hover:from-white hover:to-blue-50/40 p-6 rounded-2xl border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white border border-blue-100 flex items-center justify-center text-2xl transition-all duration-300 shadow-xs">
                  👨‍⚕️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A] group-hover:text-blue-600 transition-colors">
                    Book Doctor
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1 line-clamp-2">
                    Consult top verified doctors across 6 specialties. In-clinic visits or video consultations.
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                <span>Browse Specialists</span>
                <span className="text-base">→</span>
              </div>
            </div>

            {/* Card 2: Book Ambulance */}
            <div
              onClick={() => setIsSOSModalOpen(true)}
              className="group relative bg-white hover:bg-gradient-to-br hover:from-white hover:to-sky-50/40 p-6 rounded-2xl border border-slate-200/80 hover:border-sky-300 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 group-hover:bg-sky-600 text-sky-600 group-hover:text-white border border-sky-100 flex items-center justify-center text-2xl transition-all duration-300 shadow-xs">
                  🚑
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A] group-hover:text-sky-600 transition-colors">
                    Book Ambulance
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1 line-clamp-2">
                    24/7 Advanced Life Support (ALS/BLS) transit with ventilator and oxygen readiness.
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-600 group-hover:translate-x-1 transition-transform">
                <span>Request Ambulance</span>
                <span className="text-base">→</span>
              </div>
            </div>

            {/* Card 3: Emergency SOS */}
            <div
              onClick={() => setIsSOSModalOpen(true)}
              className="group relative bg-gradient-to-br from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white p-6 rounded-2xl border border-rose-400/30 shadow-md hover:shadow-lg shadow-rose-600/20 hover:scale-[1.02] transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur text-white flex items-center justify-center text-2xl animate-pulse">
                    🚨
                  </div>
                  <span className="text-[10px] uppercase font-mono tracking-widest bg-white/20 px-2.5 py-1 rounded-full text-white font-black border border-white/30">
                    CODE RED
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white tracking-tight">
                    Emergency SOS
                  </h3>
                  <p className="text-xs text-rose-100 mt-1 line-clamp-2">
                    1-Tap instant priority dispatch to nearest Level-1 Apex Trauma Center with live GPS streaming.
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-black text-white group-hover:translate-x-1 transition-transform">
                <span>Trigger Instant SOS</span>
                <span className="text-base">⚡</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. HEALTH VITALS STRIP                                                   */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Heart Rate</span>
              <span className="text-rose-500 text-base">❤️</span>
            </div>
            <p className="text-2xl font-black text-[#0F172A]">
              72 <span className="text-xs font-normal text-[#64748B]">bpm</span>
            </p>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              Optimal Baseline
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Blood Pressure</span>
              <span className="text-blue-500 text-base">🩺</span>
            </div>
            <p className="text-2xl font-black text-[#0F172A]">
              120/80 <span className="text-xs font-normal text-[#64748B]">mmHg</span>
            </p>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              Normal Standard
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Glucose (Fasting)</span>
              <span className="text-amber-500 text-base">🩸</span>
            </div>
            <p className="text-2xl font-black text-[#0F172A]">
              98 <span className="text-xs font-normal text-[#64748B]">mg/dL</span>
            </p>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              Healthy Reading
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Blood Group</span>
              <span className="text-indigo-500 text-base">🧬</span>
            </div>
            <p className="text-2xl font-black text-[#0F172A]">
              O+ <span className="text-xs font-normal text-[#64748B]">Positive</span>
            </p>
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md inline-block">
              Verified on Record
            </span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. STATUS SECTION (Active Consultations & Live Ambulance GPS Radar)       */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Doctor Consultation Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                    <span className="text-blue-600">📅</span> Active Consultation Status
                  </h2>
                  <p className="text-xs text-[#64748B]">Scheduled appointments and clinic intakes</p>
                </div>
                <button
                  onClick={() => navigate('/my-appointments')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  All Appointments ({appointments.length}) →
                </button>
              </div>

              <div className="mt-4">
                {activeAppointment ? (
                  <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={
                          activeAppointment.docData?.image ||
                          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300'
                        }
                        alt={activeAppointment.docData?.name || 'Doctor'}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-200 shadow-xs"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#0F172A]">{activeAppointment.docData?.name || 'Dr. Richard James'}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            activeAppointment.isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : activeAppointment.cancelled
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {activeAppointment.isCompleted ? 'Completed' : activeAppointment.cancelled ? 'Cancelled' : 'Confirmed'}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B]">
                          {activeAppointment.docData?.speciality || 'General physician'} • {activeAppointment.hospitalName || 'Lilavati Hospital & Research Centre'}
                        </p>
                        <p className="text-xs text-blue-700 font-semibold flex items-center gap-1.5">
                          <span>🕒</span>
                          <span>{activeAppointment.slotDate?.replace(/_/g, ' ')} at {activeAppointment.slotTime}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                      <span className="text-base font-black text-[#0F172A]">
                        ${activeAppointment.amount || activeAppointment.docData?.fees || 50}.00
                      </span>
                      <button
                        onClick={() => navigate('/my-appointments')}
                        className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-[#64748B] space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <span className="text-3xl block">🩺</span>
                    <p className="text-sm font-semibold text-[#0F172A]">No upcoming doctor consultations scheduled.</p>
                    <p className="text-xs text-[#64748B]">Ready for real-time bookings with top certified specialists.</p>
                    <button
                      onClick={() => navigate('/doctors')}
                      className="mt-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      + Book Consultation Now
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748B]">
              <span>Clinical Booking Status</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Teleconsultation Online
              </span>
            </div>
          </div>

          {/* Live Ambulance GPS Dispatch Radar */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                Ambulance Dispatch Radar
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ETA: {etaMinutes ? `${etaMinutes} mins` : '3 mins'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0F172A]">Unit MH-01-EQ-1108 (ALS)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {trackingStatus === 'LIVE_STREAMING' ? 'EN ROUTE' : 'STANDBY'}
                </span>
              </div>
              <p className="text-xs text-[#64748B]">
                Paramedic: <strong className="text-slate-800">Rajesh Kumar</strong> • Lilavati Base
              </p>
              {distanceKm && (
                <p className="text-[11px] text-blue-700 font-semibold">
                  📍 {distanceKm} km away from pickup point
                </p>
              )}
            </div>

            {/* Real-time Dynamic Google Maps */}
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-xs">
              <LiveMap
                latitude={driverLocation?.latitude || 19.0522}
                longitude={driverLocation?.longitude || 72.8295}
                pickupLat={pickupLocation?.latitude || 19.0600}
                pickupLng={pickupLocation?.longitude || 72.8340}
                driverName="Rajesh Kumar"
                vehicleNumber="MH-01-EQ-1108"
                status={trackingStatus === 'LIVE_STREAMING' ? 'EN ROUTE TO PICKUP' : 'GPS STANDBY'}
                height="200px"
              />
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-[#64748B] border-t border-slate-100">
              <span className="text-[11px]">Room: <strong>patient_{userData?._id || '101'}</strong></span>
              <button
                onClick={() => setIsSOSModalOpen(true)}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 underline cursor-pointer"
              >
                Dispatch Emergency 108 →
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. DOCTOR SECTION (Verified Specialists & Filtered Cards)                */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                <span>👨‍⚕️</span> Verified Medical Specialists
              </h2>
              <p className="text-xs text-[#64748B]">Book instant online or in-clinic doctor consultations</p>
            </div>

            <button
              onClick={() => navigate('/doctors')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors self-start sm:self-auto"
            >
              View All Specialists ({doctors.length}) →
            </button>
          </div>

          {/* Specialty Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {specialities.map((spec) => (
              <button
                key={spec}
                onClick={() => setSelectedSpeciality(spec)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedSpeciality === spec
                    ? 'bg-[#2563EB] text-white shadow-sm'
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
              // Skeleton Loaders
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 animate-pulse space-y-4">
                  <div className="w-full h-36 bg-slate-200 rounded-xl"></div>
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-9 bg-slate-200 rounded-xl"></div>
                </div>
              ))
            ) : filteredDoctors.length > 0 ? (
              filteredDoctors.slice(0, 6).map((doc: DoctorItem) => (
                <div
                  key={doc._id}
                  className="group bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    {/* Doctor Image Container */}
                    <div className="relative h-44 rounded-xl overflow-hidden bg-gradient-to-b from-blue-50 to-indigo-50/60 border border-slate-100">
                      <img
                        src={doc.image}
                        alt={doc.name}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-xs font-extrabold text-slate-800 shadow-xs">
                        ${doc.fees}
                      </span>
                      <span className="absolute bottom-2.5 left-2.5 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                        Available
                      </span>
                    </div>

                    {/* Doctor Details */}
                    <div>
                      <h3 className="text-base font-bold text-[#0F172A] group-hover:text-blue-600 transition-colors">
                        {doc.name}
                      </h3>
                      <p className="text-xs font-semibold text-blue-600 mt-0.5">
                        {doc.speciality}
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-1 line-clamp-2">
                        {doc.about || `${doc.experience} • Certified medical practitioner`}
                      </p>
                    </div>
                  </div>

                  {/* Booking Action */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="text-[11px] text-[#64748B]">
                      <span className="text-amber-500 font-bold">4.9 ★</span> • {doc.experience}
                    </div>
                    <button
                      onClick={() => {
                        navigate(`/appointment/${doc._id}`);
                        window.scrollTo(0, 0);
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-[#2563EB] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Book</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-[#64748B] bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <span className="text-3xl block">👨‍⚕️</span>
                <p className="text-sm font-semibold text-[#0F172A]">No specialists found in this category.</p>
                <p className="text-xs text-[#64748B]">Try selecting "All" or upload doctors via SuperAdmin Excel bulk upload.</p>
                <button
                  onClick={() => setSelectedSpeciality('All')}
                  className="mt-2 px-4 py-1.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  View All Specialties
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. RECENT ACTIVITY SECTION (Consultation & Ambulance History Tabs)        */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                <span>📋</span> Recent Activity & History
              </h2>
              <p className="text-xs text-[#64748B]">Review your past clinic consultations and emergency ambulance logs</p>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
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
                        className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                      />
                      <div>
                        <p className="text-sm font-bold text-[#0F172A]">{item.docData?.name || 'Doctor'}</p>
                        <p className="text-xs text-[#64748B]">
                          {item.docData?.speciality} • Slot: <span className="text-blue-700 font-semibold">{item.slotDate?.replace(/_/g, ' / ')} at {item.slotTime}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-900">${item.amount || 50}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        item.isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.cancelled
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {item.isCompleted ? 'Completed ✓' : item.cancelled ? 'Cancelled' : 'Confirmed'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-[#64748B] space-y-1">
                  <p className="text-xs font-semibold text-[#0F172A]">No consultation history recorded yet.</p>
                  <p className="text-[11px] text-[#64748B]">Your completed doctor appointments will be logged here.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Ambulance Dispatch History */}
          {activeTab === 'ambulance' && (
            <div className="divide-y divide-slate-100">
              {ambulanceBookings && ambulanceBookings.length > 0 ? (
                ambulanceBookings.map((trip: any, idx: number) => (
                  <div key={trip._id || idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          {trip.vehicleNumber || 'MH-01-EQ-1108'}
                        </span>
                        <h4 className="text-sm font-bold text-[#0F172A]">
                          {trip.destinationHospital?.name || 'Lilavati Hospital Trauma Center'}
                        </h4>
                      </div>
                      <p className="text-xs text-[#64748B]">
                        Paramedic: {trip.driverName || 'Rajesh Kumar'} • Condition: {trip.patientCondition || 'Emergency SOS'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                        {trip.status || 'COMPLETED'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-[#64748B] space-y-1">
                  <p className="text-xs font-semibold text-[#0F172A]">No ambulance dispatch history recorded.</p>
                  <p className="text-[11px] text-[#64748B]">Emergency 108 trips and transit logs will appear here.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Emergency SOS Modal (Interactive 1-Tap Trigger) */}
      <EmergencySOSModal
        isOpen={isSOSModalOpen}
        onClose={() => {
          setIsSOSModalOpen(false);
          fetchDashboardData();
        }}
      />
    </div>
  );
};

export default PatientDashboard;
