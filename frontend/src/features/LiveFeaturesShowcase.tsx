import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import LiveTracking from './tracking/LiveTracking';
import MapView from './maps/MapView';
import NotificationService from './notifications/NotificationService';
import NotificationToast from './notifications/NotificationToast';
import { generateBookingReceiptPDF, generateAppointmentReceiptPDF } from './pdf/pdfGenerator';
import GoogleLoginButton from './auth/GoogleLoginButton';
import ForgotPasswordModal from './auth/ForgotPasswordModal';

export const LiveFeaturesShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'MAP' | 'TRACKING' | 'HOSPITALS' | 'NOTIF' | 'PDF' | 'AUTH' | 'DASHBOARDS'>('MAP');
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState({ requests: 4, limit: 30 });
  const [notifHistory, setNotifHistory] = useState<any[]>([]);

  useEffect(() => {
    // Load nearby hospitals
    apiClient.get('/api/hospitals/nearby?lat=19.0760&lng=72.8777')
      .then((res) => {
        if (res.data?.success) setHospitals(res.data.hospitals);
      })
      .catch(() => {});

    // Subscribe to notification updates
    const unsubscribe = NotificationService.subscribe((notif: any) => {
      setNotifHistory((prev) => [notif, ...prev.slice(0, 10)]);
    });

    return () => unsubscribe();
  }, []);

  const triggerTestNotification = () => {
    NotificationService.notifyAmbulanceBooked({
      vehicleNumber: 'MH-01-EQ-1108',
      driverName: 'Rajesh Kumar (ALS Unit 108)',
    });
  };

  const triggerStatusUpdateNotification = () => {
    NotificationService.notifyStatusUpdated('BK-9912', 'EN_ROUTE_PICKUP', 'Rajesh Kumar');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      <NotificationToast />
      <ForgotPasswordModal isOpen={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)} />

      {/* Top Banner & Header */}
      <div className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/30">
              🚑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">
                  Doctor Ambulance System • <span className="text-blue-600">Live Features Showcase</span>
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  PLUG & PLAY ACTIVE
                </span>
              </div>
              <p className="text-xs text-gray-500">
                8 Advanced Production Modules running in isolated directories without modifying existing UI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className="text-xs font-semibold text-gray-600 hover:text-blue-600 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
            >
              ← Back to LifeLink Home
            </a>
            <button
              onClick={() => generateBookingReceiptPDF()}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>📄</span> Test PDF Receipt
            </button>
          </div>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 overflow-x-auto py-2 border-t border-gray-100 text-xs">
          {[
            { id: 'MAP', label: '📍 Google Maps Telemetry' },
            { id: 'TRACKING', label: '🚑 Live GPS Tracking' },
            { id: 'HOSPITALS', label: `🏥 Nearby Hospitals (${hospitals.length})` },
            { id: 'NOTIF', label: '🔔 Notifications Service' },
            { id: 'PDF', label: '📄 Dynamic PDF Generator' },
            { id: 'AUTH', label: '🔑 Auth & RBAC Security' },
            { id: 'DASHBOARDS', label: '🎛️ Real-Time Dashboards' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Showcase */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Tab 1: Map View */}
        {activeTab === 'MAP' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Module 2: Google Maps Integration (`MapView.jsx`)</h2>
                <p className="text-xs text-gray-500">
                  Interactive multi-entity map rendering patient coordinates, 5 real-time ambulance units, and 6 Level-1 Trauma Centers.
                </p>
              </div>
              <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
                /features/maps/MapView.jsx
              </span>
            </div>
            <MapView />
          </div>
        )}

        {/* Tab 2: Live Tracking */}
        {activeTab === 'TRACKING' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Module 1: Live Ambulance Tracking (`LiveTracking.jsx`)</h2>
                <p className="text-xs text-gray-500">
                  Real-time GPS telemetry component streaming speed, heading, driver details, and arrival ETA.
                </p>
              </div>
              <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
                /features/tracking/LiveTracking.jsx
              </span>
            </div>
            <LiveTracking />
          </div>
        )}

        {/* Tab 3: Nearby Hospitals */}
        {activeTab === 'HOSPITALS' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Module 3: Nearby Hospital Finder (`/api/hospitals/nearby`)</h2>
                <p className="text-xs text-gray-500">
                  Haversine-sorted trauma hospitals with real-time ICU bed availability, emergency desk numbers, and driving ETA.
                </p>
              </div>
              <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
                /features/hospitals/hospitalController.ts
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hospitals.map((hosp) => (
                <div key={hosp.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-blue-300 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                        {hosp.traumaLevel}
                      </span>
                      <h3 className="text-sm font-bold text-gray-900 mt-1.5">{hosp.name}</h3>
                      <p className="text-xs text-gray-500 line-clamp-1">{hosp.address}</p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className="text-sm font-bold text-blue-600">{hosp.distanceKm} km</p>
                      <p className="text-[11px] text-gray-400">~{hosp.estimatedDriveMinutes} mins</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-medium">ICU Beds</p>
                      <p className="text-sm font-bold text-emerald-700">{hosp.icuBedsAvailable} Available</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-medium">Emergency Desk</p>
                      <p className="text-xs font-bold text-red-600 truncate">{hosp.emergencyContact}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-amber-500 font-bold">★ {hosp.rating} Rating</span>
                    <a
                      href={`tel:${hosp.emergencyContact}`}
                      className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <span>📞</span> Call Trauma Desk
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Notifications */}
        {activeTab === 'NOTIF' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Module 4: Notification System (`NotificationService.js`)</h2>
                <p className="text-xs text-gray-500">
                  Event-based notification bus for instantaneous alerts on ambulance booking and status updates.
                </p>
              </div>
              <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
                /features/notifications/NotificationService.js
              </span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Trigger Test Events</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={triggerTestNotification}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span>🚑</span> Trigger Ambulance Dispatched Alert
                </button>
                <button
                  onClick={triggerStatusUpdateNotification}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span>🔄</span> Trigger Driver En Route Status
                </button>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-700 mb-2">Live Notification Stream Feed:</h4>
                <div className="space-y-2">
                  {notifHistory.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No notifications received yet. Click the buttons above to test!</p>
                  ) : (
                    notifHistory.map((n, i) => (
                      <div key={n.id || i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn">
                        <span className="text-base">🔔</span>
                        <div>
                          <p className="font-bold text-gray-900">{n.title}</p>
                          <p className="text-gray-600 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{n.timestamp}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Dynamic PDF Generator */}
        {activeTab === 'PDF' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Module 6: Dynamic PDF Generator (`pdfGenerator.js`)</h2>
                <p className="text-xs text-gray-500">
                  Generates an official, verifiable medical dispatch receipt with patient info, ambulance unit, and breakdown.
                </p>
              </div>
              <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
                /features/pdf/pdfGenerator.js
              </span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-sm">
                📄
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Official Ambulance Booking Receipt</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  Generates an official print-ready document formatted with hospital logos, patient vitals, GPS timestamp, and QR verification.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => generateBookingReceiptPDF({
                    patientName: 'Edward Vincent',
                    patientPhone: '+91 98765 43210',
                    vehicleNumber: 'MH-01-EQ-1108',
                    driverName: 'Rajesh Kumar',
                    pickupAddress: 'Bandra West Junction, Mumbai',
                    destinationHospital: 'Lilavati Hospital & Research Centre',
                    fare: 150,
                    emergencySeverity: 'CRITICAL_CODE_RED',
                  })}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all inline-flex items-center gap-2"
                >
                  <span>🚑</span> Ambulance Trip Receipt
                </button>

                <button
                  onClick={() => generateAppointmentReceiptPDF({
                    _id: 'appt_108291',
                    userData: { name: 'Edward Vincent' },
                    docData: { name: 'Dr. Richard James', speciality: 'General Physician', fees: 50 },
                    slotDate: 'Tomorrow',
                    slotTime: '10:00 AM',
                    amount: 50,
                    payment: true,
                    status: 'CONFIRMED',
                  })}
                  className="px-5 py-2.5 bg-[#1e2e6e] hover:bg-[#162354] text-white rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
                >
                  <span>🩺</span> Doctor Consultation Receipt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Auth Enhancements & Security */}
        {activeTab === 'AUTH' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Module 5, 7 & 8: Auth Enhancements, RBAC & Security</h2>
                <p className="text-xs text-gray-500">
                  Google OAuth, Forgot Password Recovery, `authRole.js` RBAC, and Selective `rateLimiter.js`.
                </p>
              </div>
              <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
                /features/auth & security
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Google Login Module */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-gray-800 uppercase">Modular Google Login</h3>
                <p className="text-xs text-gray-500">Plug-and-play button connecting to `/api/auth/google-login`.</p>
                <GoogleLoginButton onSuccess={(data: any) => alert(`Google login successful for ${data.user.name}!`)} />
              </div>

              {/* Forgot Password Module */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-gray-800 uppercase">Forgot Password Flow</h3>
                <p className="text-xs text-gray-500">Generates 60-minute tokenized password recovery link.</p>
                <button
                  onClick={() => setIsForgotModalOpen(true)}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
                >
                  Launch Forgot Password Modal
                </button>
              </div>
            </div>

            {/* Security & Rate Limiting Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-800 uppercase">Rate Limiting & RBAC Middleware</h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono border border-emerald-200">
                  ACTIVE
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-gray-500 font-medium">Protected Endpoints</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">/api/auth/*</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-gray-500 font-medium">Sliding Window</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">60 Seconds</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-gray-500 font-medium">Allowed Roles</p>
                  <p className="text-sm font-bold text-blue-600 mt-1">Patient, Driver, Admin</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Real-Time Multi-Dashboard Engine */}
        {activeTab === 'DASHBOARDS' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Real-Time Multi-Dashboard Engine (`/features/dashboard/`)</h2>
                <p className="text-xs text-gray-500">
                  Socket.io room-based privacy isolation: Patient, Doctor, and Admin real-time prototypes.
                </p>
              </div>
              <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200">
                ROOM-BASED SOCKETS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Patient Dashboard Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
                    👤
                  </span>
                  <h3 className="font-bold text-gray-900 text-sm">Patient Dashboard</h3>
                  <p className="text-xs text-gray-500">
                    Live appointment queue, real-time status updates without refresh, notification feed, and 1-click PDF receipt generator.
                  </p>
                  <div className="text-[11px] font-mono text-blue-700 bg-blue-50 p-2 rounded-lg">
                    Room: user_${'{userId}'}
                  </div>
                </div>
                <a
                  href="/features/patient-dashboard"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold text-center block transition-all shadow-sm"
                >
                  Launch Patient Portal →
                </a>
              </div>

              {/* Doctor Dashboard Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-bold">
                    👨‍⚕️
                  </span>
                  <h3 className="font-bold text-gray-900 text-sm">Doctor Dashboard</h3>
                  <p className="text-xs text-gray-500">
                    Strict privacy isolation: doctor sees ONLY their assigned consultations. 1-click Accept, Complete, and Cancel.
                  </p>
                  <div className="text-[11px] font-mono text-purple-700 bg-purple-50 p-2 rounded-lg">
                    Room: doctor_${'{docId}'}
                  </div>
                </div>
                <a
                  href="/features/doctor-dashboard"
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold text-center block transition-all shadow-sm"
                >
                  Launch Doctor Console →
                </a>
              </div>

              {/* Admin Dashboard Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
                    🛠️
                  </span>
                  <h3 className="font-bold text-gray-900 text-sm">Admin Dashboard</h3>
                  <p className="text-xs text-gray-500">
                    Global platform telemetry: live doctor availability toggle, doctor onboarding, and master appointment table.
                  </p>
                  <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50 p-2 rounded-lg">
                    Room: admin_room
                  </div>
                </div>
                <a
                  href="/features/admin-dashboard"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center block transition-all shadow-sm"
                >
                  Launch Admin Console →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveFeaturesShowcase;
