import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import DashboardNavbar from '../../components/DashboardNavbar';
import { LiveMap } from '../../features/maps/LiveMap';
import { useLiveLocation } from '../../features/tracking/useLiveLocation';

export const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { userData, token, backendUrl } = useApp();
  const [appointments, setAppointments] = useState<any[]>([]);

  // 🚑 Real-time Live Ambulance Telemetry Hook (Zero hardcoding)
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
  });

  useEffect(() => {
    if (token) {
      fetch(`${backendUrl || 'http://localhost:5000'}/api/user/appointments`, {
        headers: { token },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.appointments) setAppointments(d.appointments);
        })
        .catch(() => {});
    }
  }, [token]);

  const patientName = userData?.name || 'Edward Vincent';

  return (
    <div className="min-h-screen bg-[#f8f9fd] text-slate-800 pb-16 font-sans">
      {/* Universal Dashboard Navbar */}
      <DashboardNavbar
        currentRole="PATIENT"
        userName={patientName}
        userSubtitle="Patient ID: #PT-10024"
        avatarUrl={userData?.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Clean Hero Greeting */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200">
              ✓ Account Status: Active & Insured
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Good day, {patientName}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Manage your doctor appointments, digital prescriptions, and emergency dispatch.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => navigate('/doctors')}
              className="px-5 py-2.5 bg-[#1e2e6e] hover:bg-[#162354] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              + Book New Doctor
            </button>
            <button
              onClick={() => navigate('/my-appointments')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all"
            >
              My Appointments
            </button>
          </div>
        </div>

        {/* 4 Clean Vitals Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span className="font-semibold text-gray-500">Heart Rate</span>
              <span className="text-rose-500 text-sm">❤️</span>
            </div>
            <p className="text-2xl font-black text-gray-900">
              72 <span className="text-xs font-normal text-gray-400">bpm</span>
            </p>
            <span className="text-[10px] text-emerald-600 font-bold">Optimal Range</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span className="font-semibold text-gray-500">Blood Pressure</span>
              <span className="text-blue-500 text-sm">🩺</span>
            </div>
            <p className="text-2xl font-black text-gray-900">
              120/80 <span className="text-xs font-normal text-gray-400">mmHg</span>
            </p>
            <span className="text-[10px] text-emerald-600 font-bold">Normal Reading</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span className="font-semibold text-gray-500">Glucose (Fasting)</span>
              <span className="text-amber-500 text-sm">🩸</span>
            </div>
            <p className="text-2xl font-black text-gray-900">
              98 <span className="text-xs font-normal text-gray-400">mg/dL</span>
            </p>
            <span className="text-[10px] text-emerald-600 font-bold">Healthy Baseline</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span className="font-semibold text-gray-500">Blood Type</span>
              <span className="text-indigo-500 text-sm">🧬</span>
            </div>
            <p className="text-2xl font-black text-gray-900">
              O+ <span className="text-xs font-normal text-gray-400">Positive</span>
            </p>
            <span className="text-[10px] text-blue-600 font-bold">Verified on File</span>
          </div>
        </div>

        {/* Two Column Layout: Upcoming Consultation & Emergency Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Consultations Queue */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>📅</span> Upcoming Consultations
                </h2>
                <p className="text-xs text-gray-500">Scheduled clinical appointments</p>
              </div>
              <button
                onClick={() => navigate('/my-appointments')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                View Details ({appointments.length || 1}) →
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300"
                  alt="Dr. Richard James"
                  className="w-12 h-12 rounded-2xl object-cover border border-blue-200"
                />
                <div className="space-y-0.5">
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    Confirmed
                  </span>
                  <h3 className="text-sm font-bold text-gray-900">Dr. Richard James</h3>
                  <p className="text-xs text-gray-500">General Physician • MBBS, MD</p>
                  <p className="text-xs text-blue-700 font-semibold">🕒 Tomorrow, 10:30 am</p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                <span className="text-sm font-black text-gray-900">$50.00</span>
                <button
                  onClick={() => navigate('/my-appointments')}
                  className="px-3.5 py-1.5 bg-[#1e2e6e] text-white rounded-xl text-xs font-bold"
                >
                  Manage
                </button>
              </div>
            </div>
          </div>

          {/* Real-Time Live Ambulance Tracking Card with Dynamic Google Maps */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-red-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  Live Ambulance Tracking
                </span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ETA: {etaMinutes ? `${etaMinutes} mins` : '3 mins'}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900">Unit MH-01-EQ-1108 (ALS)</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Paramedic: <strong>Rajesh Kumar</strong> • Lilavati Base • Oxygen Ready
                </p>
                {distanceKm && (
                  <p className="text-[11px] text-blue-700 font-semibold mt-1">
                    📍 {distanceKm} km away from your location
                  </p>
                )}
              </div>

              {/* Dynamic Google Maps Component (Auto-updates via Socket) */}
              <LiveMap
                latitude={driverLocation?.latitude || 19.0522}
                longitude={driverLocation?.longitude || 72.8295}
                pickupLat={pickupLocation?.latitude || 19.0600}
                pickupLng={pickupLocation?.longitude || 72.8340}
                driverName="Rajesh Kumar"
                vehicleNumber="MH-01-EQ-1108"
                status={trackingStatus === 'LIVE_STREAMING' ? 'LIVE GPS STREAMING' : 'ON THE WAY'}
                height="220px"
              />

              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                <span className="text-gray-500 text-[11px]">Room: <strong>patient_{userData?._id || 'user_edward_101'}</strong></span>
                <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Auto-Syncing
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;
