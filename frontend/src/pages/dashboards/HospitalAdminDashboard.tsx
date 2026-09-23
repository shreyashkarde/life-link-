import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import DashboardNavbar from '../../components/DashboardNavbar';

export const HospitalAdminDashboard: React.FC = () => {
  const { showToast, backendUrl, token } = useApp();
  const [icuBeds, setIcuBeds] = useState(14);
  const [inboundRides, setInboundRides] = useState<any[]>([]);

  useEffect(() => {
    const fetchInbound = async () => {
      try {
        const authToken = token || localStorage.getItem('token') || '';
        const res = await fetch(`${backendUrl || 'http://localhost:5000'}/api/hospital/ambulance-bookings`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (data.success && data.bookings) {
          setInboundRides(data.bookings);
        }
      } catch (e) {}
    };
    fetchInbound();
  }, [backendUrl, token]);

  return (
    <div className="min-h-screen bg-[#f8f9fd] text-slate-800 pb-16 font-sans">
      <DashboardNavbar
        currentRole="ADMIN_HOSPITAL"
        userName="Lilavati Hospital Admin"
        userSubtitle="Apex Level 1 Trauma Center"
        avatarUrl="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Hospital Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200">
              Level 1 Apex Trauma Center
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Lilavati Hospital & Research Centre
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Bandra West Reclamation, Mumbai • 24/7 Trauma Emergency Desk & ICU Resuscitation
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setIcuBeds((prev) => Math.max(0, prev - 1));
                showToast('ICU Resuscitation Bed allocated to emergency intake.', 'success');
              }}
              className="px-4 py-2.5 bg-[#1e2e6e] hover:bg-[#162354] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              + Allocate ICU Bed
            </button>
          </div>
        </div>

        {/* 4 Clean Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">ICU Beds Available</p>
            <p className="text-2xl font-black text-emerald-700">
              {icuBeds} <span className="text-xs text-gray-400 font-normal">/ 28</span>
            </p>
            <span className="text-[10px] text-emerald-600 font-bold">Resuscitation Ready</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Doctors on Duty</p>
            <p className="text-2xl font-black text-gray-900">
              15 <span className="text-xs text-gray-400 font-normal">/ 18</span>
            </p>
            <span className="text-[10px] text-blue-600 font-bold">6 Specialties Active</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Inpatient Admissions</p>
            <p className="text-2xl font-black text-gray-900">
              218 <span className="text-xs text-gray-400 font-normal">/ 320</span>
            </p>
            <span className="text-[10px] text-gray-400 font-bold">68% Bed Occupancy</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Inbound Ambulances</p>
            <p className="text-2xl font-black text-red-600">{inboundRides.length} Units</p>
            <span className="text-[10px] text-red-600 font-bold">
              {inboundRides.length > 0 ? 'Code-Red Inbound' : 'Standby Mode'}
            </span>
          </div>
        </div>

        {/* Live Trauma Stream & Bed Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>🚨</span> Inbound Emergency Inflow
              </h2>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                ACTIVE
              </span>
            </div>

            <div className="space-y-3">
              {inboundRides && inboundRides.length > 0 ? (
                inboundRides.map((ride: any, idx: number) => (
                  <div key={ride._id || idx} className="p-3.5 bg-red-50/50 border border-red-200 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-800">Unit {ride.vehicleNumber || 'MH-01-EQ-1108'}</span>
                      <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded-full">
                        {ride.status || 'INBOUND'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700">Patient: {ride.patientName} • {ride.patientCondition || 'Emergency Intake'}</p>
                    <p className="text-[11px] text-gray-500">Paramedic {ride.driverName || 'Rajesh Kumar'} • {ride.emergencySeverity}</p>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-400 bg-slate-50/50 rounded-2xl border border-dashed border-gray-200 space-y-1">
                  <p className="text-xs font-semibold text-gray-500">No active emergency ambulance inbound.</p>
                  <p className="text-[11px] text-gray-400">Trauma emergency desk on 24/7 standby.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>🛏️</span> ICU Resuscitation Bays
              </h2>
              <span className="text-xs text-emerald-700 font-bold">{icuBeds} Bays Vacant</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="font-semibold text-gray-700">ICU Bays #01 - #10</p>
                <p className="text-emerald-700 font-bold mt-1">✓ 8 Ready for Intake</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="font-semibold text-gray-700">ICU Bays #11 - #20</p>
                <p className="text-emerald-700 font-bold mt-1">✓ 6 Ready for Intake</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="font-semibold text-gray-700">Ventilator Support</p>
                <p className="text-blue-700 font-bold mt-1">4/4 Online</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="font-semibold text-gray-700">Trauma Surgeons</p>
                <p className="text-blue-700 font-bold mt-1">Team On Standby</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HospitalAdminDashboard;
