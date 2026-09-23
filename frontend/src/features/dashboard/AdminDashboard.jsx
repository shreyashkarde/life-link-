import React, { useState, useEffect } from 'react';
import socketClient from '../realtime/socketClient';
import { generateAppointmentReceiptPDF } from '../pdf/pdfGenerator';
import DashboardNavbar from '../../components/DashboardNavbar';

/**
 * 🛠️ AdminDashboard.jsx
 * Modular, Real-Time Admin Dashboard
 * - Global Platform Metrics: Total doctors, patients, appointments, revenue
 * - Real-time updates via Socket.io room "admin_room"
 * - Manage Doctors: Availability toggle, physician roster, onboarding quick action
 * - Master Appointment Monitor: Global visibility with emergency controls
 */
export const AdminDashboard = () => {
  const [metrics, setMetrics] = useState({
    totalDoctors: 15,
    availableDoctors: 15,
    totalPatients: 1248,
    totalAppointments: 42,
    grossRevenue: 48920,
  });
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('APPOINTMENTS'); // APPOINTMENTS, DOCTORS, ANALYTICS
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Global Admin Metrics & All Appointments
  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      // Fetch metrics
      const metricRes = await fetch(`${backendUrl}/api/realtime-appointments/admin-metrics`);
      const metricData = await metricRes.json();
      if (metricData.success && metricData.metrics) {
        setMetrics(metricData.metrics);
        if (metricData.appointments) setAppointments(metricData.appointments);
      }

      // Fetch doctors roster
      const docRes = await fetch(`${backendUrl}/api/doctor/list`);
      const docData = await docRes.json();
      if (docData.success && docData.doctors) {
        setDoctors(docData.doctors);
      }
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();

    // 2. Join Admin Room for Global Updates
    socketClient.joinAdminRoom();

    // 3. Listen for Global Real-Time Appointment Events
    const unsubBooked = socketClient.onAppointmentBooked((newAppt) => {
      setAppointments((prev) => [newAppt, ...prev.filter((a) => a._id !== newAppt._id)]);
      setMetrics((prev) => ({
        ...prev,
        totalAppointments: prev.totalAppointments + 1,
        grossRevenue: prev.grossRevenue + (newAppt.amount || 50),
      }));
    });

    const unsubUpdated = socketClient.onAppointmentUpdated((updatedAppt) => {
      setAppointments((prev) =>
        prev.map((a) => (a._id === updatedAppt._id ? { ...a, ...updatedAppt } : a))
      );
    });

    const unsubCancelled = socketClient.onAppointmentCancelled((cancelledAppt) => {
      setAppointments((prev) =>
        prev.map((a) => (a._id === cancelledAppt._id ? { ...a, cancelled: true, status: 'CANCELLED' } : a))
      );
    });

    return () => {
      if (unsubBooked) unsubBooked();
      if (unsubUpdated) unsubUpdated();
      if (unsubCancelled) unsubCancelled();
    };
  }, []);

  // Toggle Doctor Availability
  const handleToggleDoctorAvailability = async (docId) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/admin/change-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId }),
      });
      const data = await res.json();
      if (data.success) {
        setDoctors((prev) =>
          prev.map((d) => (d._id === docId ? { ...d, available: data.available } : d))
        );
      }
    } catch (err) {
      console.error('Toggle doctor availability error:', err);
    }
  };

  // Admin Appointment Cancel / Complete Control
  const handleAppointmentAction = async (appointmentId, status) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/realtime-appointments/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, status }),
      });
      const data = await res.json();
      if (data.success) {
        setAppointments((prev) =>
          prev.map((a) => (a._id === appointmentId ? { ...a, ...data.appointment } : a))
        );
      }
    } catch (err) {
      console.error('Admin appointment action error:', err);
    }
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter((a) => {
    const docName = (a.docData?.name || '').toLowerCase();
    const patientName = (a.userData?.name || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return docName.includes(query) || patientName.includes(query);
  });

  return (
    <div className="min-h-screen bg-[#f8f9fd] text-slate-800 pb-16 font-sans">
      <DashboardNavbar
        currentRole="SUPER_ADMIN"
        userName="Central Health Admin"
        userSubtitle="Global Command Console • Room: admin_room"
        avatarUrl="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Admin Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-full border border-blue-200">
              ⚡ Global Administrative Authority • Socket Room: admin_room
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Hospital & Consultation Master Console
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Real-time monitoring across all doctors, patient bookings, clinical availability, and billing settlements.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => fetchAdminData()}
              className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <span>🔄 Refresh Data</span>
            </button>
          </div>
        </div>

        {/* 4 Master Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Total Registered Patients</p>
            <p className="text-2xl font-black text-gray-900">{metrics.totalPatients}</p>
            <span className="text-[10px] text-emerald-600 font-bold">+18 Today</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Total Doctors Onboarded</p>
            <p className="text-2xl font-black text-[#1e2e6e]">{metrics.totalDoctors}</p>
            <span className="text-[10px] text-blue-600 font-bold">{metrics.availableDoctors} Online Now</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Total Bookings Recorded</p>
            <p className="text-2xl font-black text-purple-600">{metrics.totalAppointments}</p>
            <span className="text-[10px] text-purple-600 font-bold">Real-time Streamed</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Platform Gross Volume</p>
            <p className="text-2xl font-black text-emerald-700">${metrics.grossRevenue.toLocaleString()}</p>
            <span className="text-[10px] text-emerald-600 font-bold">Consults & Dispatches</span>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setSelectedTab('APPOINTMENTS')}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${
                selectedTab === 'APPOINTMENTS'
                  ? 'bg-[#1e2e6e] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📅 All Appointments ({appointments.length})
            </button>
            <button
              onClick={() => setSelectedTab('DOCTORS')}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${
                selectedTab === 'DOCTORS'
                  ? 'bg-[#1e2e6e] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              👨‍⚕️ Manage Doctors ({doctors.length})
            </button>
          </div>

          {selectedTab === 'APPOINTMENTS' && (
            <div className="px-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient or doctor..."
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 w-48 sm:w-64"
              />
            </div>
          )}
        </div>

        {/* Tab 1: All Appointments Monitor */}
        {selectedTab === 'APPOINTMENTS' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>📋</span> Master Appointment Directory
              </h2>
              <span className="text-xs text-gray-400">Total: {filteredAppointments.length}</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Loading global records...</div>
            ) : filteredAppointments.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No appointments matching search criteria.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Doctor</th>
                      <th className="py-3 px-4">Schedule</th>
                      <th className="py-3 px-4">Fees</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Admin Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredAppointments.map((appt) => {
                      const user = appt.userData || {};
                      const doc = appt.docData || {};
                      const isCancelled = appt.cancelled || appt.status === 'CANCELLED';
                      const isCompleted = appt.isCompleted || appt.status === 'COMPLETED';

                      return (
                        <tr key={appt._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-gray-900">
                            {user.name || 'Patient'}
                            <span className="block text-[10px] text-gray-400 font-normal">{user.phone || '+1 234 567 8900'}</span>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-gray-800">
                            {doc.name || 'Doctor'}
                            <span className="block text-[10px] text-blue-600 font-normal">{doc.speciality || 'General Medicine'}</span>
                          </td>

                          <td className="py-3.5 px-4 text-gray-600">
                            {appt.slotDate || 'Today'}
                            <span className="block text-[10px] text-gray-400">{appt.slotTime || '10:00 AM'}</span>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-gray-900">
                            ${appt.amount || 50}
                          </td>

                          <td className="py-3.5 px-4">
                            {isCompleted ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                                Completed
                              </span>
                            ) : isCancelled ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
                                Cancelled
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                Active / Confirmed
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => generateAppointmentReceiptPDF(appt)}
                                className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-200 text-[11px] font-medium"
                                title="Download PDF Receipt"
                              >
                                📄 PDF
                              </button>

                              {!isCancelled && !isCompleted && (
                                <button
                                  onClick={() => handleAppointmentAction(appt._id, 'CANCELLED')}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-bold"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Manage Doctors Roster & Availability */}
        {selectedTab === 'DOCTORS' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>👨‍⚕️</span> Certified Physician Directory ({doctors.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doc) => (
                <div
                  key={doc._id}
                  className="p-4 rounded-2xl border border-gray-100 bg-[#f8f9fd] flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={doc.image}
                      alt={doc.name}
                      className="w-12 h-12 rounded-xl object-cover border border-gray-200"
                    />
                    <div>
                      <p className="font-bold text-gray-900 text-xs sm:text-sm">{doc.name}</p>
                      <p className="text-[11px] text-blue-700 font-semibold">{doc.speciality}</p>
                      <p className="text-[10px] text-gray-400">${doc.fees} • {doc.experience}</p>
                    </div>
                  </div>

                  {/* Availability Toggle */}
                  <button
                    onClick={() => handleToggleDoctorAvailability(doc._id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                      doc.available !== false
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-rose-50 text-rose-600 border-rose-300'
                    }`}
                  >
                    {doc.available !== false ? '✓ Available' : '✕ Offline'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
