import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../services/apiClient';
import socketService from '../../services/socket';
import soundService from '../../services/soundService';
import { useApp } from '../../context/AppContext';
import { IncomingRequestCard } from './IncomingRequestCard';

export type DriverRideStatus =
  | 'IDLE'
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'EN_ROUTE_PICKUP'
  | 'PATIENT_PICKED'
  | 'PATIENT_ONBOARD'
  | 'COMPLETED';

export const DriverDashboard: React.FC = () => {
  const { showToast } = useApp();

  const [isOnDuty, setIsOnDuty] = useState<boolean>(true);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [rideStatus, setRideStatus] = useState<DriverRideStatus>('IDLE');
  const [isSimulatingGps, setIsSimulatingGps] = useState<boolean>(false);
  const [recentTrips, setRecentTrips] = useState<any[]>([]);

  // Driver GPS position
  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number }>({
    lat: 19.0544,
    lng: 72.8277,
  });

  // 1. Fetch active driver trips from API
  const fetchActiveTrips = async () => {
    try {
      const res = await apiClient.get('/api/bookings/driver-trips');
      if (res.data?.success && Array.isArray(res.data.bookings)) {
        const active = res.data.bookings.find(
          (b: any) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && b.status !== 'REJECTED'
        );
        if (active) {
          setActiveBooking(active);
          setRideStatus(active.status || 'ACCEPTED');
        } else {
          setActiveBooking(null);
          setRideStatus('IDLE');
        }
        setRecentTrips(res.data.bookings);
      }
    } catch {
      // Fallback mode
    }
  };

  useEffect(() => {
    fetchActiveTrips();

    socketService.connect();
    socketService.joinDriver('driver_108');

    // Listen to incoming ambulance dispatches
    const unsubRequest = socketService.onAmbulanceRequest((req: any) => {
      setIncomingRequest(req);
      try {
        soundService.playDispatchAlert();
      } catch {}
      showToast(`🚨 New Emergency Dispatch Alert #${(req.bookingId || '').slice(-6)}!`, 'error');
    });

    // Listen to status updates
    const unsubStatus = socketService.onStatusUpdate((data: any) => {
      if (data?.status) {
        setRideStatus(data.status);
      }
      fetchActiveTrips();
    });

    return () => {
      if (typeof unsubRequest === 'function') unsubRequest();
      if (typeof unsubStatus === 'function') unsubStatus();
    };
  }, []);

  // 2. Continuous GPS Tracking Stream (every 2.5s)
  useEffect(() => {
    if (!isOnDuty) return;

    const interval = setInterval(() => {
      const payload = {
        driverId: 'driver_108',
        userId: 'driver_108',
        bookingId: activeBooking?._id || activeBooking?.bookingId || 'SOS-108992',
        patientId: activeBooking?.patientId || 'user_1',
        hospitalId: activeBooking?.hospitalId || 'hosp_lilavati',
        lat: driverCoords.lat,
        lng: driverCoords.lng,
        latitude: driverCoords.lat,
        longitude: driverCoords.lng,
        heading: 45,
        speed: rideStatus === 'IDLE' ? 0 : 54,
        timestamp: new Date().toISOString(),
      };

      socketService.emitDriverLocation(payload);
    }, 2500);

    return () => clearInterval(interval);
  }, [isOnDuty, activeBooking, driverCoords, rideStatus]);

  // 3. Status Transition Handlers
  const handleTransitionStatus = async (nextStatus: DriverRideStatus) => {
    setRideStatus(nextStatus);
    const bId = activeBooking?._id || activeBooking?.bookingId || 'SOS-108992';

    const messages: Record<string, string> = {
      ACCEPTED: 'Ride Accepted! Priority Green Corridor Active.',
      EN_ROUTE: 'Status: En Route to patient location with sirens.',
      PATIENT_PICKED: 'Status: Patient Picked Up! Driving to trauma hospital.',
      COMPLETED: 'Mission Completed! Patient admitted safely.',
    };

    showToast(messages[nextStatus] || `Status updated to ${nextStatus}`, 'success');

    try {
      // 1. Socket status broadcast
      socketService.updateRideStatus({
        bookingId: bId,
        status: nextStatus,
        patientId: activeBooking?.patientId,
      });

      // 2. API DB update
      await apiClient.post('/api/bookings/status', {
        bookingId: bId,
        status: nextStatus,
      });

      if (nextStatus === 'COMPLETED') {
        setActiveBooking(null);
        setRideStatus('IDLE');
      }
      fetchActiveTrips();
    } catch {}
  };

  // 4. Simulate Live Driving Corridor Movement
  const handleSimulateCorridor = async () => {
    setIsSimulatingGps(true);
    soundService.playEmergencySiren(2);
    showToast('🚀 Simulating priority ambulance movement along Bandra corridor...', 'info');

    const waypoints = [
      { lat: 19.0600, lng: 72.8340, note: 'Entering S.V. Road' },
      { lat: 19.0570, lng: 72.8320, note: 'Passing Bandra Junction' },
      { lat: 19.0545, lng: 72.8305, note: 'Reclamation Flyover' },
      { lat: 19.0522, lng: 72.8295, note: 'Arrived at Lilavati Trauma Center' },
    ];

    for (let i = 0; i < waypoints.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 2000));
      const wp = waypoints[i];
      setDriverCoords({ lat: wp.lat, lng: wp.lng });
      socketService.emitDriverLocation({
        driverId: 'driver_108',
        bookingId: activeBooking?._id || 'SOS-108992',
        lat: wp.lat,
        lng: wp.lng,
        heading: 180,
        speed: 52,
      });
      showToast(`📍 [GPS Stream] ${wp.note}`, 'info');
    }

    setIsSimulatingGps(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Floating Incoming Dispatch Modal (Uber/Porter style) */}
      <IncomingRequestCard
        request={incomingRequest}
        onAccept={(bId) => {
          setIncomingRequest(null);
          fetchActiveTrips();
        }}
        onReject={(bId) => {
          setIncomingRequest(null);
        }}
      />

      {/* Header Banner & Duty Switch */}
      <div className="bg-slate-800/90 rounded-3xl p-6 border border-slate-700 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
              alt="Driver Rajesh"
              className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
            />
            <span
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                isOnDuty ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">Driver Rajesh Kumar</h1>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                Unit MH-01-EQ-1108
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Lilavati Hospital Trauma Hub • 24/7 Priority Paramedic Patrol
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSimulateCorridor}
            disabled={isSimulatingGps}
            className="px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>🛰️</span>
            <span>{isSimulatingGps ? 'Simulating...' : 'Simulate GPS Stream'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !isOnDuty;
              setIsOnDuty(next);
              showToast(`Duty Status: ${next ? 'ONLINE' : 'OFFLINE'}`, next ? 'success' : 'info');
            }}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              isOnDuty
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isOnDuty ? 'bg-white' : 'bg-slate-400'}`} />
            <span>{isOnDuty ? 'ONLINE (ON DUTY)' : 'OFFLINE'}</span>
          </button>
        </div>
      </div>

      {/* Active Mission Card & Ride Lifecycle Buttons */}
      {activeBooking ? (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/50 shadow-2xl space-y-6 animate-in fade-in">
          {/* Mission Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-2xl animate-pulse">
                🚨
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-md">
                  Active Mission: {rideStatus}
                </span>
                <h2 className="text-lg font-black text-white mt-1">
                  Patient {activeBooking.patientName || 'Emergency Patient'}
                </h2>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400 font-bold">Contact: {activeBooking.patientPhone || '+91 98200 99999'}</p>
              <p className="text-sm font-black text-emerald-400 mt-0.5">Fare: ₹{activeBooking.fare || 150}</p>
            </div>
          </div>

          {/* Route Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700 space-y-1">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Pickup Location</p>
              <p className="text-slate-200 font-bold text-sm">
                {activeBooking.pickupLocation?.address || 'Current Patient GPS Ping'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700 space-y-1">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Destination Hospital</p>
              <p className="text-slate-200 font-bold text-sm">
                {activeBooking.destinationHospital?.name || activeBooking.hospitalName || 'Lilavati Hospital Trauma Care'}
              </p>
            </div>
          </div>

          {/* Ride Lifecycle Action Control Stepper */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Ride Lifecycle Transition Controls:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* 1. Accept */}
              <button
                type="button"
                onClick={() => handleTransitionStatus('ACCEPTED')}
                className={`py-3.5 px-4 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  rideStatus === 'ACCEPTED'
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/20 shadow-lg'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <span>✓</span>
                <span>1. Accept Ride</span>
              </button>

              {/* 2. Start Ride / En Route */}
              <button
                type="button"
                onClick={() => handleTransitionStatus('EN_ROUTE')}
                className={`py-3.5 px-4 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  rideStatus === 'EN_ROUTE' || rideStatus === 'EN_ROUTE_PICKUP'
                    ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 shadow-lg'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <span>🚗</span>
                <span>2. Start Ride (En Route)</span>
              </button>

              {/* 3. Pickup Patient */}
              <button
                type="button"
                onClick={() => handleTransitionStatus('PATIENT_PICKED')}
                className={`py-3.5 px-4 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  rideStatus === 'PATIENT_PICKED' || rideStatus === 'PATIENT_ONBOARD'
                    ? 'bg-amber-600 text-white ring-4 ring-amber-500/20 shadow-lg'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <span>🧑‍🦽</span>
                <span>3. Pickup Patient</span>
              </button>

              {/* 4. Complete Ride */}
              <button
                type="button"
                onClick={() => handleTransitionStatus('COMPLETED')}
                className="py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🏥</span>
                <span>4. Complete Mission</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Standby Card */
        <div className="bg-slate-800/60 rounded-3xl p-8 border border-slate-700/80 text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto animate-pulse">
            🛰️
          </div>
          <h3 className="text-lg font-black text-white">Standby • Ready for Emergency Dispatch</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You are connected to the central dispatch network. When a patient clicks emergency SOS, the incoming request card will appear instantly.
          </p>
        </div>
      )}

      {/* Recent Trips Log */}
      <div className="bg-slate-800/80 rounded-3xl p-6 border border-slate-700 space-y-3">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <span>📋</span>
          <span>Recent Dispatch Missions ({recentTrips.length})</span>
        </h3>

        <div className="divide-y divide-slate-700/60 text-xs">
          {recentTrips.slice(0, 4).map((trip) => (
            <div key={trip._id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-extrabold text-slate-200">Patient: {trip.patientName || 'Emergency Patient'}</p>
                <p className="text-slate-400 text-[11px]">{trip.destinationHospital?.name || trip.hospitalName || 'Lilavati Hospital'}</p>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded-md font-bold text-[10px]">
                  {trip.status}
                </span>
                <p className="text-emerald-400 font-mono font-bold mt-0.5">₹{trip.fare || 150}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
