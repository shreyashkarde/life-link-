import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import DashboardNavbar from '../../components/DashboardNavbar';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useApp();

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
              className="px-5 py-2.5 bg-[#1e2e6e] hover:bg-[#162354] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              + Onboard Doctor
            </button>
            <button
              onClick={() => navigate('/admin/all-appointments')}
              className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold rounded-xl transition-all"
            >
              All Appointments
            </button>
          </div>
        </div>

        {/* Master Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Total Patients</p>
            <p className="text-2xl font-black text-gray-900">1,248</p>
            <span className="text-[10px] text-emerald-600 font-bold">+18 Joined Today</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Active Doctors</p>
            <p className="text-2xl font-black text-[#1e2e6e]">
              15 <span className="text-xs text-gray-400 font-normal">/ 15</span>
            </p>
            <span className="text-[10px] text-blue-600 font-bold">100% Online & Verified</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Ambulance Fleet</p>
            <p className="text-2xl font-black text-red-600">
              5 <span className="text-xs text-gray-400 font-normal">/ 5 Units</span>
            </p>
            <span className="text-[10px] text-emerald-600 font-bold">GPS Streaming Active</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Platform Volume</p>
            <p className="text-2xl font-black text-emerald-700">$48,920</p>
            <span className="text-[10px] text-emerald-600 font-bold">Consults & Dispatches</span>
          </div>
        </div>

        {/* Live System Log & Administrative Operations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live System Event Stream */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="text-red-500">📡</span> Live Telemetry & Code-Red Feed
              </h2>
              <span className="text-[10px] bg-red-50 text-red-600 font-bold px-2.5 py-0.5 rounded-full border border-red-200">
                REALTIME STREAM
              </span>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div className="p-3.5 bg-red-50/50 rounded-2xl border border-red-100 space-y-1">
                <div className="flex items-center justify-between text-red-700 font-bold">
                  <span>[CODE-RED SOS] Booking #sos_108992</span>
                  <span className="text-[11px] font-mono text-red-500">Just Now</span>
                </div>
                <p className="text-gray-700 font-medium">Assigned: Unit MH-01-EQ-1108 • Driver Rajesh Kumar</p>
                <p className="text-gray-500 text-[11px]">Lat: 19.0760, Lng: 72.8777 • ETA Lilavati Trauma Bay: 3 mins</p>
              </div>

              <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-1">
                <div className="flex items-center justify-between text-emerald-800 font-bold">
                  <span>[CONSULTATION] Dr. Richard James</span>
                  <span className="text-[11px] font-mono text-emerald-600">5 mins ago</span>
                </div>
                <p className="text-gray-700 font-medium">Appointment #apt_101 completed with Edward Vincent ($50.00)</p>
                <p className="text-gray-500 text-[11px]">Status: Completed • High-Performance Synchronized</p>
              </div>

              <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-1">
                <div className="flex items-center justify-between text-blue-800 font-bold">
                  <span>[DISPATCH COMPLETE] Unit MH-02-AB-2024</span>
                  <span className="text-[11px] font-mono text-blue-600">12 mins ago</span>
                </div>
                <p className="text-gray-700 font-medium">Patient safely admitted to Hinduja Hospital Emergency Ward</p>
                <p className="text-gray-500 text-[11px]">Duration: 14 mins • Distance: 6.2 km</p>
              </div>
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
                to="/features"
                className="w-full p-3.5 rounded-2xl bg-[#f8f9fd] hover:bg-gray-100 text-gray-800 border border-gray-100 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">⚡</span>
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">Modular Features Hub</p>
                    <p className="text-[11px] text-gray-500">Live GPS tracking, Google Maps route, and PDF Rx generator</p>
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
