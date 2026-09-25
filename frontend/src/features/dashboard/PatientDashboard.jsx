import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socketClient from '../realtime/socketClient';
import { generateAppointmentReceiptPDF } from '../pdf/pdfGenerator';
import NotificationService from '../notifications/NotificationService';
import DashboardNavbar from '../../components/DashboardNavbar';
import { getBackendUrl } from '../../config/backendUrl';

/**
 * 👤 PatientDashboard.jsx
 * Modular, Real-Time Patient Dashboard
 * - Real-time Status: Pending / Confirmed / Completed / Cancelled via Socket.io
 * - Room-based isolation: socket.join(userId)
 * - Appointment History with status filters
 * - 1-Click PDF Receipt Download
 * - Live Notification Bell & Dropdown
 * - Timeline View of Care Journey
 */
export const PatientDashboard = ({ initialUserId = 'user_edward_101' }) => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(initialUserId);
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('ALL'); // ALL, UPCOMING, COMPLETED, CANCELLED
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [liveSocketStatus, setLiveSocketStatus] = useState(socketClient.isConnected);

  // 1. Initial Load of Patient Appointments
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/realtime-appointments/patient-appointments?userId=${userId}`);
      const data = await res.json();
      if (data.success && data.appointments) {
        setAppointments(data.appointments);
      }
    } catch (err) {
      console.error('Failed to load patient appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();

    // 2. Join Patient's Isolated Socket Room
    socketClient.joinUserRoom(userId);

    // 3. Listen for Real-Time Socket Events (No Page Refresh Needed)
    const unsubBooked = socketClient.onAppointmentBooked((newAppt) => {
      if (newAppt.userId === userId || newAppt.userData?._id === userId) {
        setAppointments((prev) => [newAppt, ...prev.filter((a) => a._id !== newAppt._id)]);
        NotificationService.notifyAppointmentBooked(newAppt);
      }
    });

    const unsubUpdated = socketClient.onAppointmentUpdated((updatedAppt) => {
      if (updatedAppt.userId === userId || updatedAppt.userData?._id === userId) {
        setAppointments((prev) =>
          prev.map((a) => (a._id === updatedAppt._id ? { ...a, ...updatedAppt } : a))
        );
        if (updatedAppt.status === 'CONFIRMED') {
          NotificationService.notifyDoctorAccepted(updatedAppt);
        } else {
          NotificationService.notifyAppointmentUpdated(updatedAppt, updatedAppt.status);
        }
      }
    });

    const unsubCancelled = socketClient.onAppointmentCancelled((cancelledAppt) => {
      if (cancelledAppt.userId === userId || cancelledAppt.userData?._id === userId) {
        setAppointments((prev) =>
          prev.map((a) => (a._id === cancelledAppt._id ? { ...a, cancelled: true, status: 'CANCELLED' } : a))
        );
        NotificationService.notifyAppointmentCancelled(cancelledAppt);
      }
    });

    // 4. Subscribe to Local Notification Bus
    const unsubNotifs = NotificationService.subscribe(() => {
      setNotifications([...NotificationService.getHistory()]);
    });
    setNotifications([...NotificationService.getHistory()]);

    const statusInterval = setInterval(() => {
      setLiveSocketStatus(socketClient.isConnected);
    }, 2000);

    return () => {
      if (unsubBooked) unsubBooked();
      if (unsubUpdated) unsubUpdated();
      if (unsubCancelled) unsubCancelled();
      if (unsubNotifs) unsubNotifs();
      clearInterval(statusInterval);
    };
  }, [userId]);

  // Cancel Appointment Action
  const handleCancelAppointment = async (apptId) => {
    if (!window.confirm('Are you sure you want to cancel this consultation?')) return;
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/realtime-appointments/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: apptId, status: 'CANCELLED', userId }),
      });
      const data = await res.json();
      if (data.success) {
        setAppointments((prev) =>
          prev.map((a) => (a._id === apptId ? { ...a, cancelled: true, status: 'CANCELLED' } : a))
        );
      }
    } catch (err) {
      console.error('Cancel appointment error:', err);
    }
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter((item) => {
    if (filter === 'ALL') return true;
    if (filter === 'UPCOMING') return !item.cancelled && item.status !== 'COMPLETED';
    if (filter === 'COMPLETED') return item.isCompleted || item.status === 'COMPLETED';
    if (filter === 'CANCELLED') return item.cancelled || item.status === 'CANCELLED';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8f9fd] text-slate-800 pb-16 font-sans">
      {/* Dashboard Top Navigation */}
      <DashboardNavbar
        currentRole="PATIENT"
        userName="Edward Vincent"
        userSubtitle="Patient Portal • Room: user_edward_101"
        avatarUrl="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Top Control Bar: Greeting + Real-Time Socket Badge + Notification Bell */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Socket.io: {liveSocketStatus ? 'Connected (Room Active)' : 'Listening'}
              </span>
              <span className="text-xs text-gray-400 font-medium">
                Data Isolation: <strong className="text-gray-700">user_{userId}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Patient Care & Appointments
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Live consultation queues, real-time doctor confirmations, and instant verifiable PDF receipts.
            </p>
          </div>

          {/* Right Header Actions: Bell & Book CTA */}
          <div className="flex items-center gap-3 relative">
            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="w-11 h-11 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center relative transition-all"
                title="Notifications"
              >
                <span className="text-lg">🔔</span>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showNotifMenu && (
                <div className="absolute right-0 top-14 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Live Alerts Feed</h4>
                    <span className="text-[10px] text-gray-400">{notifications.length} alerts</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 mt-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-gray-400 py-4 text-center">No alerts yet</p>
                    ) : (
                      notifications.map((n, idx) => (
                        <div key={n.id || idx} className="py-2.5 space-y-0.5 text-xs">
                          <p className="font-bold text-gray-800">{n.title}</p>
                          <p className="text-gray-500 text-[11px]">{n.message}</p>
                          <span className="text-[10px] text-gray-400">{n.timestamp}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/doctors')}
              className="px-5 py-2.5 bg-[#1e2e6e] hover:bg-[#162354] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>+ Book Doctor</span>
            </button>
          </div>
        </div>

        {/* 4 Clean Vitals / Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Total Consultations</p>
            <p className="text-2xl font-black text-gray-900">{appointments.length}</p>
            <span className="text-[10px] text-blue-600 font-bold">Lifetime History</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Upcoming Visits</p>
            <p className="text-2xl font-black text-emerald-600">
              {appointments.filter((a) => !a.cancelled && a.status !== 'COMPLETED').length}
            </p>
            <span className="text-[10px] text-emerald-600 font-bold">Confirmed / Pending</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Completed Sessions</p>
            <p className="text-2xl font-black text-purple-600">
              {appointments.filter((a) => a.isCompleted || a.status === 'COMPLETED').length}
            </p>
            <span className="text-[10px] text-purple-600 font-bold">Rx Available</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Cancelled / Closed</p>
            <p className="text-2xl font-black text-red-500">
              {appointments.filter((a) => a.cancelled || a.status === 'CANCELLED').length}
            </p>
            <span className="text-[10px] text-gray-400 font-medium">Slots Released</span>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs">
            {['ALL', 'UPCOMING', 'COMPLETED', 'CANCELLED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  filter === tab
                    ? 'bg-[#1e2e6e] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab === 'ALL' && 'All Appointments'}
                {tab === 'UPCOMING' && 'Upcoming & Confirmed'}
                {tab === 'COMPLETED' && 'Completed'}
                {tab === 'CANCELLED' && 'Cancelled'}
              </button>
            ))}
          </div>

          <span className="text-xs text-gray-400 font-medium px-3 hidden sm:inline">
            Showing {filteredAppointments.length} of {appointments.length} consultations
          </span>
        </div>

        {/* Appointments Cards + Timeline View */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-3xl p-12 text-center text-gray-400 text-sm">
              Loading real-time appointment records...
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center space-y-3 border border-gray-100">
              <span className="text-4xl">🩺</span>
              <p className="text-base font-bold text-gray-700">No appointments found in this view</p>
              <p className="text-xs text-gray-400">Schedule your consultation with any certified specialist in seconds.</p>
              <button
                onClick={() => navigate('/doctors')}
                className="px-6 py-2.5 bg-[#1e2e6e] text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Find & Book Doctor
              </button>
            </div>
          ) : (
            filteredAppointments.map((appt) => {
              const doc = appt.docData || {};
              const isCancelled = appt.cancelled || appt.status === 'CANCELLED';
              const isCompleted = appt.isCompleted || appt.status === 'COMPLETED';
              const isConfirmed = appt.status === 'CONFIRMED';
              const isPending = !isCancelled && !isCompleted && !isConfirmed;

              return (
                <div
                  key={appt._id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 group"
                >
                  {/* Doctor Info & Timeline Pillar */}
                  <div className="flex items-start gap-4">
                    <img
                      src={doc.image || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300'}
                      alt={doc.name || 'Doctor'}
                      className="w-16 h-16 rounded-2xl object-cover object-top border border-gray-100 shadow-sm"
                    />

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-gray-900">{doc.name || 'Certified Physician'}</h3>
                        {/* Real-time Status Badge */}
                        {isPending && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            ⏳ PENDING CONFIRMATION
                          </span>
                        )}
                        {isConfirmed && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ CONFIRMED BY DOCTOR
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            ✓ COMPLETED
                          </span>
                        )}
                        {isCancelled && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            ✕ CANCELLED
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-blue-700 font-semibold">{doc.speciality || 'General Medicine'}</p>

                      <div className="flex items-center gap-3 text-xs text-gray-500 pt-0.5">
                        <span className="flex items-center gap-1 font-medium">
                          <span>📅</span> {appt.slotDate || 'Tomorrow'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-medium">
                          <span>⏰</span> {appt.slotTime || '10:00 AM'}
                        </span>
                        <span>•</span>
                        <span className="font-bold text-gray-800">${appt.amount || doc.fees || 50}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & PDF Receipt */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                    {/* PDF Receipt Button */}
                    <button
                      onClick={() => generateAppointmentReceiptPDF(appt)}
                      className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                      title="Download Official PDF Consultation Receipt"
                    >
                      <span>📄</span>
                      <span>PDF Receipt</span>
                    </button>

                    {/* Cancel Button if not already cancelled or completed */}
                    {!isCancelled && !isCompleted && (
                      <button
                        onClick={() => handleCancelAppointment(appt._id)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl transition-all"
                      >
                        Cancel Slot
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;
