import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import DashboardNavbar from '../../components/DashboardNavbar';
import { LiveMap } from '../../features/maps/LiveMap';
import { useLiveLocation } from '../../features/tracking/useLiveLocation';

export const DriverDashboard: React.FC = () => {
  const { showToast, backendUrl } = useApp();
  const apiBase = backendUrl || 'http://localhost:5000';
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [tripStatus, setTripStatus] = useState<'IDLE' | 'ASSIGNED' | 'EN_ROUTE_PICKUP' | 'PATIENT_ONBOARD' | 'COMPLETED'>('ASSIGNED');

  // 📍 Live Driver Location Telemetry Hook
  const { currentLocation, pickupLocation, updateLocation } = useLiveLocation({
    role: 'driver',
    driverId: 'driver_108',
    patientId: 'user_edward_101',
    bookingId: 'SOS-108992',
    autoWatchGps: true,
  });

  const handleDutyToggle = async () => {
    const nextStatus = !isOnDuty;
    setIsOnDuty(nextStatus);
    showToast(`Duty Status: ${nextStatus ? 'ONLINE' : 'OFFLINE'}`, 'info');
    try {
      await fetch(`${apiBase}/api/ambulance/duty-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: nextStatus }),
      });
    } catch (e) {}
  };

  const handleStatusTransition = async (status: typeof tripStatus) => {
    setTripStatus(status);
    const messages: Record<string, string> = {
      EN_ROUTE_PICKUP: 'Status updated: En route to patient pickup.',
      PATIENT_ONBOARD: 'Status updated: Patient onboard, driving to Trauma Center.',
      COMPLETED: 'Trip Completed! Patient admitted safely.',
    };
    showToast(messages[status] || `Status updated to ${status}`, 'success');

    // Notify backend and patient room
    try {
      await fetch(`${apiBase}/api/driver/trips/trip_108992/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token') || localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ status }),
      });
    } catch (e) {}
  };

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
    showToast(`Live GPS emitted to Patient Room: ${nextLat}, ${nextLng}`, 'info');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fd] text-slate-800 pb-16 font-sans">
      <DashboardNavbar
        currentRole="DRIVER"
        userName="Rajesh Kumar"
        userSubtitle="ALS Paramedic • Unit MH-01-EQ-1108"
        avatarUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Paramedic Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <span className="inline-block px-3 py-1 bg-red-50 text-red-700 font-bold text-xs rounded-full border border-red-200">
              Unit 108 • Advanced Life Support (ALS)
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Rajesh Kumar • MH-01-EQ-1108
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Affiliated Trauma Center: Lilavati Hospital & Research Centre • Bandra West Base
            </p>
          </div>

          <button
            onClick={handleDutyToggle}
            className={`px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all shadow-xs ${
              isOnDuty
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
            <span>{isOnDuty ? 'ONLINE (READY FOR DISPATCH)' : 'OFFLINE'}</span>
          </button>
        </div>

        {/* 4 Clean Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Live GPS Speed</p>
            <p className="text-2xl font-black text-gray-900">
              45 <span className="text-xs text-gray-400 font-normal">km/h</span>
            </p>
            <span className="text-[10px] text-emerald-600 font-bold">Telemetry Active</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Oxygen Cylinder (O2)</p>
            <p className="text-2xl font-black text-[#1e2e6e]">
              94% <span className="text-xs text-gray-400 font-normal">Full</span>
            </p>
            <span className="text-[10px] text-blue-600 font-bold">Defibrillator Ready</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Today's Completed Trips</p>
            <p className="text-2xl font-black text-gray-900">
              4 <span className="text-xs text-gray-400 font-normal">Runs</span>
            </p>
            <span className="text-[10px] text-emerald-600 font-bold">100% On-Time</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Driver Rating</p>
            <p className="text-2xl font-black text-amber-500">5.0 ★</p>
            <span className="text-[10px] text-gray-400">42 Verified Reviews</span>
          </div>
        </div>

        {/* Active Emergency Dispatch Order Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <span className="text-[10px] bg-red-50 text-red-700 font-bold px-2.5 py-0.5 rounded-full border border-red-200 uppercase tracking-wider">
                Priority Emergency Alert
              </span>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mt-1">
                Dispatch Order #SOS-108992
              </h2>
            </div>

            <span className="px-3 py-1 bg-slate-100 text-slate-800 font-mono text-xs rounded-xl font-bold">
              Status: {tripStatus}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Patient Information</p>
              <p className="text-sm font-bold text-gray-900">Edward Vincent (45 yrs)</p>
              <p className="text-gray-500">Phone: <strong className="text-gray-800">+91 98765 43210</strong></p>
              <p className="text-red-700 font-semibold bg-red-50/70 p-2 rounded-xl border border-red-100">
                Condition: Acute Chest Pain & Oxygen Support Needed
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Route Details</p>
              <p className="text-gray-700"><strong>Pickup:</strong> Bandra West Junction (1.2 km away)</p>
              <p className="text-gray-700"><strong>Destination:</strong> Lilavati Hospital Trauma Center</p>
              <p className="text-emerald-700 font-semibold bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                Resuscitation Bay #04 Confirmed Ready
              </p>
            </div>
          </div>

          {/* Dynamic Google Maps Dispatch Radar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="font-semibold text-gray-700">Live Dynamic Map & Route View</span>
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live GPS Stream to Patient
              </span>
            </div>
            <LiveMap
              latitude={currentLocation?.latitude || 19.0522}
              longitude={currentLocation?.longitude || 72.8295}
              pickupLat={pickupLocation?.latitude || 19.0600}
              pickupLng={pickupLocation?.longitude || 72.8340}
              driverName="Rajesh Kumar"
              vehicleNumber="MH-01-EQ-1108"
              status={tripStatus}
              height="240px"
            />
          </div>

          {/* Sequential Action Buttons + Live GPS Broadcaster */}
          <div className="pt-2 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleStatusTransition('EN_ROUTE_PICKUP')}
                disabled={tripStatus !== 'ASSIGNED'}
                className="flex-1 py-3 bg-[#1e2e6e] hover:bg-[#162354] disabled:opacity-30 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                1. En Route to Pickup Point →
              </button>
              <button
                onClick={() => handleStatusTransition('PATIENT_ONBOARD')}
                disabled={tripStatus !== 'EN_ROUTE_PICKUP'}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                2. Patient Onboard (To Hospital) →
              </button>
              <button
                onClick={() => handleStatusTransition('COMPLETED')}
                disabled={tripStatus !== 'PATIENT_ONBOARD'}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                3. Complete Ride at Hospital ✓
              </button>
            </div>

            {/* Live GPS Broadcast Trigger */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 border border-blue-200 text-xs">
              <div className="flex items-center gap-2 text-blue-900">
                <span className="text-sm">🛰️</span>
                <span>Live GPS Emitter: <strong>{currentLocation ? `${currentLocation.latitude}, ${currentLocation.longitude}` : '19.0522, 72.8295'}</strong></span>
              </div>
              <button
                type="button"
                onClick={handleSimulateMovement}
                className="px-4 py-1.5 bg-[#1e2e6e] hover:bg-[#162354] active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Simulate Drive (+100m) →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;
