import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../../context/AppContext';
import DashboardNavbar from '../../components/DashboardNavbar';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { aToken, token, backendUrl } = useApp();
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchAdminDash = async () => {
    try {
      setLoading(true);
      const authToken = aToken || token || sessionStorage.getItem('aToken') || localStorage.getItem('token') || '';
      const { data } = await axios.get(`${backendUrl}/api/admin/dashboard`, {
        headers: { atoken: authToken, token: authToken },
      });
      if (data.success && data.dashData) {
        setDashData(data.dashData);
      }
    } catch (e: any) {
      console.error('SuperAdmin Dashboard Fetch Error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDash();
  }, [aToken, token, backendUrl]);

  return (
    <div className="min-h-screen bg-[#f8f9fd] text-slate-800 pb-16 font-sans">
      {/* Universal Clean Dashboard Navbar */}
      <DashboardNavbar
        currentRole="SUPER_ADMIN"
        userName="System Administrator"
        userSubtitle="Super Admin Master Console"
        avatarUrl="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
      />

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Clean Hero Greeting */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <span className="inline-block px-3 py-1 bg-purple-50 text-purple-700 font-bold text-xs rounded-full border border-purple-200">
              ⚡ Master Control Node • System Operational
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Super Admin Console
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Global system monitoring, physician credentials, ambulance GPS dispatch nodes, and financial summaries.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => navigate('/admin/add-doctor')}
              className="px-5 py-2.5 bg-[#1e2e6e] hover:bg-[#162354] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              + Onboard Doctor
            </button>
            <button
              onClick={() => navigate('/admin/all-appointments')}
              className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              All Appointments
            </button>
          </div>
        </div>

        {/* Master Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Total Patients</p>
            <p className="text-2xl font-black text-gray-900">{dashData?.patients ?? 0}</p>
            <span className="text-[10px] text-emerald-600 font-bold">Registered Users</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Active Doctors</p>
            <p className="text-2xl font-black text-[#1e2e6e]">
              {dashData?.doctors ?? 0} <span className="text-xs text-gray-400 font-normal">Verified</span>
            </p>
            <span className="text-[10px] text-blue-600 font-bold">In-System Roster</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Total Appointments</p>
            <p className="text-2xl font-black text-red-600">
              {dashData?.appointments ?? 0}
            </p>
            <span className="text-[10px] text-emerald-600 font-bold">Consultation Orders</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Platform Status</p>
            <p className="text-2xl font-black text-emerald-700">100%</p>
            <span className="text-[10px] text-emerald-600 font-bold">Services Online</span>
          </div>
        </div>

        {/* Live System Log & Administrative Operations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live System Event Stream */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="text-red-500">📡</span> Live Telemetry & Bookings Feed
              </h2>
              <span className="text-[10px] bg-red-50 text-red-600 font-bold px-2.5 py-0.5 rounded-full border border-red-200">
                REALTIME STREAM
              </span>
            </div>

            <div className="space-y-3 font-sans text-xs">
              {dashData?.latestAppointments && dashData.latestAppointments.length > 0 ? (
                dashData.latestAppointments.map((item: any, idx: number) => (
                  <div key={item._id || idx} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-indigo-900 font-bold">
                      <span>[CONSULTATION] {item.docData?.name || 'Practitioner'}</span>
                      <span className="text-[11px] font-mono text-indigo-600">${item.amount || 50}</span>
                    </div>
                    <p className="text-gray-700 font-medium">Patient: {item.userData?.name || 'Walk-in'} • Slot: {item.slotDate?.replace(/_/g, ' / ')} at {item.slotTime}</p>
                    <p className="text-gray-500 text-[11px]">Status: {item.isCompleted ? 'Completed' : item.cancelled ? 'Cancelled' : 'Scheduled'}</p>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-gray-400 bg-slate-50/50 rounded-2xl border border-dashed border-gray-200 space-y-1">
                  <p className="text-xs font-semibold text-gray-500">No live booking events logged yet.</p>
                  <p className="text-[11px] text-gray-400">Activity will display here in real time as consultations occur.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Administrative Operations */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>🛡️</span> Administrative Operations
              </h2>
              <span className="text-xs text-gray-400 font-medium">System Tools</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <Link
                to="/admin/all-appointments"
                className="w-full p-3.5 rounded-2xl bg-[#f8f9fd] hover:bg-gray-100 text-gray-800 border border-gray-100 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">📅</span>
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Manage All Doctor Appointments</p>
                    <p className="text-[11px] text-gray-500">View, reschedule, or cancel bookings across all hospitals</p>
                  </div>
                </div>
                <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
              </Link>

              <Link
                to="/admin/add-doctor"
                className="w-full p-3.5 rounded-2xl bg-[#f8f9fd] hover:bg-gray-100 text-gray-800 border border-gray-100 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">➕</span>
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">Onboard New Certified Physician</p>
                    <p className="text-[11px] text-gray-500">Upload credentials, specialty, fees, and bio</p>
                  </div>
                </div>
                <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
              </Link>

              <Link
                to="/admin/doctor-list"
                className="w-full p-3.5 rounded-2xl bg-[#f8f9fd] hover:bg-gray-100 text-gray-800 border border-gray-100 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">👨‍⚕️</span>
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">Physicians Roster & Availability Toggle</p>
                    <p className="text-[11px] text-gray-500">Toggle live booking status and manage fees</p>
                  </div>
                </div>
                <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
              </Link>

              <Link
                to="/admin/all-appointments"
                className="w-full p-3.5 rounded-2xl bg-[#f8f9fd] hover:bg-gray-100 text-gray-800 border border-gray-100 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">📅</span>
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">Global Appointments Feed</p>
                    <p className="text-[11px] text-gray-500">Live booking logs, cancellations, and doctor assignments</p>
                  </div>
                </div>
                <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
