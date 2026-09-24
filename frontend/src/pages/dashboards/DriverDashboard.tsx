import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import DashboardNavbar from '../../components/DashboardNavbar';
import { LiveMap } from '../../features/maps/LiveMap';
import { useLiveLocation } from '../../features/tracking/useLiveLocation';
import { apiClient } from '../../services/apiClient';
import { socketService } from '../../services/socket';

export const DriverDashboard: React.FC = () => {
  const { showToast, backendUrl, refreshVersion } = useApp();
  const apiBase = backendUrl || 'http://localhost:5000';

  const [isOnDuty, setIsOnDuty] = useState<boolean>(true);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [tripStatus, setTripStatus] = useState<'IDLE' | 'ASSIGNED' | 'EN_ROUTE_PICKUP' | 'PATIENT_ONBOARD' | 'COMPLETED'>('IDLE');
  const [tripHistory, setTripHistory] = useState<any[]>([]);

  // 📍 Live Driver Location Telemetry Hook
  const { currentLocation, pickupLocation, updateLocation } = useLiveLocation({
    role: 'driver',
    driverId: 'driver_108',
    patientId: activeBooking?.patientId || incomingRequest?.patientId || 'user_edward_101',
    bookingId: activeBooking?.bookingId || activeBooking?._id || 'SOS-108992',
    autoWatchGps: true,
  });

  // Fetch active trips assigned to driver
  const fetchDriverTrips = async () => {
    try {
      const res = await apiClient.get('/api/bookings/driver-trips');
      const data = res.data;
      const rawList = data.trips || data.bookings || [];
      if (data.success && Array.isArray(rawList)) {
        const active = rawList.find((t: any) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
        if (active) {
          setActiveBooking(active);
          setTripStatus(active.status || 'ASSIGNED');
          setIncomingRequest(null);
        } else {
          setActiveBooking(null);
          setTripStatus('IDLE');
        }
        setTripHistory(rawList);
      } else {
        setTripHistory([]);
      }
    } catch (e) {
      // Standby mode
    }
  };

  useEffect(() => {
    fetchDriverTrips();

    // 🔔 Socket.IO Real-time Driver Dispatch Subscription
    socketService.connect();
    socketService.joinDriver('driver_108');

    const unsubBooking = socketService.onNewBooking((booking: any) => {
      const pName = booking?.patientName || booking?.userData?.name || 'Emergency Patient';
      const cond = booking?.patientCondition || booking?.emergencyType || 'Emergency SOS';
      const pAddress = booking?.pickupLocation?.address || 'GPS Ping Location';

      setIncomingRequest({
        bookingId: booking._id || booking.bookingId || 'SOS-' + Date.now(),
        patientId: booking.patientId || 'user_edward_101',
        patientName: pName,
        patientPhone: booking.patientPhone || '+91 98200 99999',
        emergencySeverity: booking.emergencySeverity || 'CRITICAL CODE-RED',
        condition: cond,
        pickupAddress: pAddress,
        destinationHospital: booking.hospitalName || 'Lilavati Hospital & Research Centre',
        distanceKm: booking.distanceKm || 1.4,
        etaMinutes: booking.etaMinutes || 3,
      });

      showToast(`🚨 New Emergency Dispatch Alert for ${pName}!`, 'error');
    });

    const unsubCleared = socketService.onDataCleared(() => {
      console.log('🧹 [DriverDashboard] DB Cleared event received. Resetting state...');
      setActiveBooking(null);
      setIncomingRequest(null);
      setTripStatus('IDLE');
      setTripHistory([]);
      fetchDriverTrips();
    });

    const unsubRideStatus = socketService.onRideStatusUpdate((data: any) => {
      if (data?.status) {
        setTripStatus(data.status);
      }
      fetchDriverTrips();
    });

    return () => {
      if (typeof unsubBooking === 'function') unsubBooking();
      if (typeof unsubCleared === 'function') unsubCleared();
      if (typeof unsubRideStatus === 'function') unsubRideStatus();
    };
  }, [apiBase, refreshVersion]);

  // Duty Toggle
  const handleDutyToggle = async () => {
    const nextStatus = !isOnDuty;
    setIsOnDuty(nextStatus);
    showToast(`Duty Status: ${nextStatus ? 'ONLINE (GPS Streaming & Patrol Active)' : 'OFFLINE'}`, nextStatus ? 'success' : 'info');
    try {
      await apiClient.post('/api/ambulance/duty-toggle', { isAvailable: nextStatus });
    } catch (e) {}
  };

  // Simulate Incoming Emergency Request
  const handleSimulateIncomingEmergency = () => {
    setIncomingRequest({
      bookingId: 'SOS-108992',
      patientId: 'user_edward_101',
      patientName: 'Edward Vincent',
      patientPhone: '+91 98765 43210',
      patientAge: 45,
      emergencySeverity: 'CRITICAL CODE-RED',
      condition: 'Acute Cardiac Chest Pain & Respiratory Distress',
      pickupAddress: 'Bandra West Reclamation Junction, Mumbai',
      destinationHospital: 'Lilavati Hospital & Research Centre',
      distanceKm: 1.2,
      etaMinutes: 3,
    });
    showToast('🚨 Code-Red Emergency Dispatch Signal Received!', 'error');
  };

  // Accept Emergency Order
  const handleAcceptIncoming = async () => {
    if (!incomingRequest) return;
    const accepted = { ...incomingRequest, status: 'ACCEPTED' };
    setActiveBooking(accepted);
    setTripStatus('ASSIGNED');
    setIncomingRequest(null);
    showToast('✅ Emergency Dispatch Accepted! Green Corridor Active.', 'success');

    try {
      await apiClient.post('/api/bookings/accept', { bookingId: incomingRequest.bookingId });
      fetchDriverTrips();
    } catch (e) {}
  };

  // Reject Emergency Order
  const handleRejectIncoming = () => {
    setIncomingRequest(null);
    showToast('Dispatch passed to secondary fleet unit.', 'info');
  };

  // 5-Stage Ride Lifecycle Transition
  const handleStatusTransition = async (status: typeof tripStatus) => {
    setTripStatus(status);
    const messages: Record<string, string> = {
      EN_ROUTE_PICKUP: 'Status updated: En route to patient pickup point.',
      PATIENT_ONBOARD: 'Status updated: Patient onboard! Driving to Trauma Center.',
      COMPLETED: 'Trip Completed! Patient admitted safely to Trauma Bay.',
    };
    showToast(messages[status] || `Status updated to ${status}`, 'success');

    const bookingId = activeBooking?._id || activeBooking?.bookingId || 'SOS-108992';
    try {
      await apiClient.post('/api/bookings/status', { bookingId, status });
      if (status === 'COMPLETED') {
        setActiveBooking(null);
        setTripStatus('IDLE');
      }
      fetchDriverTrips();
    } catch (e) {}
  };

  // Live GPS Simulator (+100m movement broadcast)
  const handleSimulateMovement = () => {
    const curLat = currentLocation?.latitude || 19.0522;
    const curLng = currentLocation?.longitude || 72.8295;
    const nextLat = Number((curLat + 0.0012).toFixed(4));
    const nextLng = Number((curLng + 0.0008).toFixed(4));
    updateLocation({
      latitude: nextLat,
      longitude: nextLng,
      heading: 40,
      speed: 48,
    });
    showToast(`🛰️ Live GPS Telemetry Emitted: ${nextLat}, ${nextLng}`, 'info');
  };

  const isEmergencyActive = !!activeBooking || !!incomingRequest;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-20 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Universal Dashboard Navbar */}
      <DashboardNavbar
        currentRole="DRIVER"
        userName="Rajesh Kumar"
        userSubtitle="ALS Paramedic • Unit MH-01-EQ-1108"
        avatarUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-7">
        
        {/* ========================================================================= */}
        {/* 1. HEADER SECTION (Greeting, Unit ID & Online/Offline Duty Toggle)       */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"
                alt="Rajesh Kumar"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-blue-200 shadow-xs"
              />
              <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                isOnDuty ? 'bg-emerald-500' : 'bg-slate-400'
              }`}></span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                  Driver Rajesh Kumar 👋
                </h1>
                <span className="text-blue-600 text-base font-black" title="Certified Paramedic">✓</span>
              </div>
              
              <p className="text-xs sm:text-sm text-[#64748B] font-medium">
                Unit <strong className="text-slate-900">MH-01-EQ-1108</strong> • Advanced Life Support (ALS) • 24/7 Network
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                  <span>🏥</span> Lilavati Hospital Trauma Base
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span>🛰️</span> GPS Telemetry Active
                </span>
              </div>
            </div>
          </div>

          {/* Online / Offline Controller */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            {!isEmergencyActive && (
              <button
                type="button"
                onClick={handleSimulateIncomingEmergency}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Simulate incoming dispatch signal"
              >
                ⚡ Test SOS Signal
              </button>
            )}

            <button
              type="button"
              onClick={handleDutyToggle}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all shadow-xs cursor-pointer ${
                isOnDuty
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isOnDuty ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
              <span>{isOnDuty ? 'ONLINE (READY FOR DISPATCH)' : 'OFFLINE'}</span>
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. TOP PRIORITY STATUS BANNER (GREEN = PATROL / RED = EMERGENCY ACTIVE)  */}
        {/* ========================================================================= */}
        <section>
          {isEmergencyActive ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white shadow-md border border-rose-400/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl animate-pulse">
                  🚨
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-md">
                      CODE-RED EMERGENCY ACTIVE
                    </span>
                    <span className="text-xs text-rose-100 font-mono font-bold">Priority Corridor</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black mt-0.5">
                    Emergency Dispatch Mission in Progress
                  </h2>
                </div>
              </div>

              <div className="text-xs text-rose-100 font-semibold bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/20">
                ETA to Hospital: <strong className="text-white">3 mins</strong> • Lilavati Trauma Bay #04
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xs border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
                  🚑
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-md">
                      ACTIVE PATROL • STANDBY
                    </span>
                    <span className="text-xs text-emerald-100 font-mono font-bold">GPS Streaming</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold mt-0.5">
                    Unit 108 Available for Priority Emergency Dispatch
                  </h2>
                </div>
              </div>

              <div className="text-xs text-emerald-100 font-medium">
                Trauma Emergency Network: <strong className="text-white">24/7 Monitoring Online</strong>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 3. QUICK TELEMETRY STATS (4 MICRO CARDS)                                 */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Live GPS Speed</span>
              <span className="text-blue-600 text-base">🏎️</span>
            </div>
            <p className="text-2xl font-black text-[#0F172A]">
              {isOnDuty ? '48' : '0'} <span className="text-xs font-normal text-[#64748B]">km/h</span>
            </p>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              Telemetry Active
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Oxygen (O2) Tank</span>
              <span className="text-blue-600 text-base">🫁</span>
            </div>
            <p className="text-2xl font-black text-[#2563EB]">
              98% <span className="text-xs font-normal text-[#64748B]">Full</span>
            </p>
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md inline-block">
              Ventilator Ready
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Today's Missions</span>
              <span className="text-emerald-600 text-base">✓</span>
            </div>
            <p className="text-2xl font-black text-[#0F172A]">
              {tripHistory.length} <span className="text-xs font-normal text-[#64748B]">Runs</span>
            </p>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              100% On-Time
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-semibold">Paramedic Rating</span>
              <span className="text-amber-500 text-base">★</span>
            </div>
            <p className="text-2xl font-black text-amber-500">5.0 ★</p>
            <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-md inline-block">
              Verified ALS
            </span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. INCOMING EMERGENCY REQUEST (MAIN USP - URGENT & HIGH VISIBILITY)       */}
        {/* ========================================================================= */}
        {incomingRequest && (
          <section className="bg-gradient-to-br from-rose-50 via-white to-red-50 p-6 sm:p-8 rounded-3xl border-2 border-rose-500 shadow-xl space-y-6 animate-bounce-short">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center text-xl animate-pulse">
                  🚨
                </span>
                <div>
                  <span className="text-[10px] uppercase font-mono font-black bg-rose-600 text-white px-2.5 py-0.5 rounded-full tracking-wider">
                    {incomingRequest.emergencySeverity}
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                    Incoming Emergency Dispatch Order #{incomingRequest.bookingId}
                  </h2>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-mono font-bold text-rose-600">ETA: {incomingRequest.etaMinutes} mins</p>
                <p className="text-[11px] text-slate-500">{incomingRequest.distanceKm} km from current GPS</p>
              </div>
            </div>

            {/* Emergency Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-1.5">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Patient & Condition</p>
                <h3 className="text-base font-black text-slate-900">{incomingRequest.patientName} ({incomingRequest.patientAge} yrs)</h3>
                <p className="text-slate-600 font-medium">Contact: <strong className="text-slate-900">{incomingRequest.patientPhone}</strong></p>
                <p className="text-rose-700 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200 mt-1">
                  Condition: {incomingRequest.condition}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-1.5">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Transit Route</p>
                <p className="text-slate-800 font-medium"><strong>Pickup:</strong> {incomingRequest.pickupAddress}</p>
                <p className="text-slate-800 font-medium"><strong>Destination:</strong> {incomingRequest.destinationHospital}</p>
                <p className="text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-200 mt-1">
                  Lilavati Resuscitation Bay Confirmed Ready
                </p>
              </div>
            </div>

            {/* Urgent 1-Tap Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleAcceptIncoming}
                className="w-full sm:flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>✓ ACCEPT DISPATCH ORDER</span>
                <span className="text-lg">→</span>
              </button>

              <button
                type="button"
                onClick={handleRejectIncoming}
                className="w-full sm:w-auto px-8 py-4 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold text-xs rounded-2xl border border-slate-300 transition-all cursor-pointer"
              >
                ✕ Pass to Secondary Unit
              </button>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 5. CURRENT RIDE PANEL (5-STAGE PROGRESSION & ACTION BUTTONS)              */}
        {/* ========================================================================= */}
        {activeBooking && (
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                  ACTIVE MISSION LIFECYCLE
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] mt-1">
                  Dispatch Order #{activeBooking.bookingId || activeBooking._id?.slice(-6) || 'SOS-108992'}
                </h2>
              </div>

              <span className="px-3.5 py-1.5 bg-slate-100 text-slate-900 font-mono text-xs rounded-xl font-bold">
                Status: {tripStatus}
              </span>
            </div>

            {/* 5-Stage Stepper Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span className={tripStatus === 'ASSIGNED' ? 'text-blue-600' : ''}>1. Accepted</span>
                <span className={tripStatus === 'EN_ROUTE_PICKUP' ? 'text-blue-600' : ''}>2. En Route</span>
                <span className={tripStatus === 'PATIENT_ONBOARD' ? 'text-blue-600' : ''}>3. Patient Onboard</span>
                <span className={tripStatus === 'COMPLETED' ? 'text-emerald-600' : ''}>4. Admitted</span>
              </div>

              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-500 ${
                    tripStatus === 'ASSIGNED'
                      ? 'w-1/4 bg-blue-500'
                      : tripStatus === 'EN_ROUTE_PICKUP'
                      ? 'w-2/4 bg-indigo-600'
                      : tripStatus === 'PATIENT_ONBOARD'
                      ? 'w-3/4 bg-amber-500'
                      : 'w-full bg-emerald-600'
                  }`}
                ></div>
              </div>
            </div>

            {/* Active Patient Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Patient File</p>
                <h3 className="text-base font-bold text-slate-900">{activeBooking.patientName || 'Edward Vincent'}</h3>
                <p className="text-slate-600">Phone: <strong className="text-slate-900">{activeBooking.patientPhone || '+91 98765 43210'}</strong></p>
                <p className="text-red-700 font-semibold bg-red-50 p-2 rounded-xl border border-red-100 mt-1">
                  Condition: {activeBooking.condition || activeBooking.patientCondition || 'Emergency Medical Transport'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Navigation Route</p>
                <p className="text-slate-800"><strong>Pickup:</strong> {activeBooking.pickupAddress || 'Bandra West Reclamation'}</p>
                <p className="text-slate-800"><strong>Destination:</strong> {activeBooking.destinationHospital || 'Lilavati Hospital Trauma Bay'}</p>
                <div className="flex gap-2 pt-2">
                  <a
                    href={`tel:${activeBooking.patientPhone || '+919876543210'}`}
                    className="flex-1 py-2 text-center bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    📞 Call Patient
                  </a>
                  <a
                    href="tel:02226751000"
                    className="flex-1 py-2 text-center bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    🏥 Call Hospital
                  </a>
                </div>
              </div>
            </div>

            {/* Large 1-Tap Sequential Buttons */}
            <div className="pt-2 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleStatusTransition('EN_ROUTE_PICKUP')}
                  disabled={tripStatus !== 'ASSIGNED'}
                  className="py-3.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-30 disabled:pointer-events-none text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>1. En Route to Pickup Point</span>
                  <span>→</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusTransition('PATIENT_ONBOARD')}
                  disabled={tripStatus !== 'EN_ROUTE_PICKUP'}
                  className="py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:pointer-events-none text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>2. Patient Onboard (To Hospital)</span>
                  <span>→</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusTransition('COMPLETED')}
                  disabled={tripStatus !== 'PATIENT_ONBOARD'}
                  className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 disabled:pointer-events-none text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>3. Complete Ride at Hospital</span>
                  <span>✓</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* 6. MAP / LOCATION SECTION (DYNAMIC GOOGLE MAP + GPS SIMULATOR)           */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <span>🗺️</span> Real-time Navigation & Live GPS Stream
              </h2>
              <p className="text-xs text-[#64748B]">Driver location stream broadcasted to patient tracking room</p>
            </div>

            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Socket Room Active: <strong>ride_SOS-108992</strong>
            </span>
          </div>

          {/* Dynamic Map Component */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
            <LiveMap
              latitude={currentLocation?.latitude || 19.0522}
              longitude={currentLocation?.longitude || 72.8295}
              pickupLat={pickupLocation?.latitude || 19.0600}
              pickupLng={pickupLocation?.longitude || 72.8340}
              driverName="Rajesh Kumar"
              vehicleNumber="MH-01-EQ-1108"
              status={tripStatus === 'IDLE' ? 'PATROL STANDBY' : tripStatus}
              height="260px"
            />
          </div>

          {/* Live Telemetry Emitter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs gap-3">
            <div className="flex items-center gap-2 text-blue-900">
              <span className="text-base">🛰️</span>
              <span>
                Live GPS Broadcast: <strong>{currentLocation ? `${currentLocation.latitude}, ${currentLocation.longitude}` : '19.0522, 72.8295'}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={handleSimulateMovement}
              className="w-full sm:w-auto px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Simulate Drive (+100m)</span>
              <span>→</span>
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. RIDE HISTORY & MISSION LOGS                                           */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <span>📋</span> Completed Emergency Dispatches
              </h2>
              <p className="text-xs text-[#64748B]">History of successfully admitted emergency runs</p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {tripHistory.length} Total Runs
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {tripHistory && tripHistory.length > 0 ? (
              tripHistory.map((item: any, idx: number) => (
                <div key={item.id || item._id || idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded border border-red-200">
                        {item.id || item.bookingId || 'SOS-108990'}
                      </span>
                      <h3 className="text-sm font-bold text-[#0F172A]">
                        {item.patientName || item.userData?.name || 'Emergency Patient'}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.status || 'COMPLETED'}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B]">
                      Route: {item.pickup || item.pickupLocation?.address || 'Pickup Point'} → <strong className="text-slate-800">{item.destination || item.destinationHospital?.name || 'Lilavati Trauma Bay'}</strong>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Condition: {item.condition || item.patientCondition || 'Emergency Intake'} • Time: {item.time || 'Today'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 inline-block">
                      Patient Admitted Safely ✓
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-[#64748B] space-y-1">
                <p className="text-xs font-semibold text-[#0F172A]">No completed dispatches logged yet.</p>
                <p className="text-[11px] text-[#64748B]">Completed emergency missions will be recorded here.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default DriverDashboard;
