import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import DashboardNavbar from '../../components/DashboardNavbar';

export const DoctorDashboard: React.FC = () => {
  const { showToast } = useApp();
  const [isAvailable, setIsAvailable] = useState(true);
  const [consultations, setConsultations] = useState([
    {
      id: 'apt_101',
      patientName: 'Edward Vincent',
      patientPhone: '+1 123 456 7890',
      age: 28,
      slotTime: '10:30 am',
      fees: 50,
      status: 'SCHEDULED',
      condition: 'Routine health checkup & blood panel review',
    },
    {
      id: 'apt_102',
      patientName: 'Sarah Jenkins',
      patientPhone: '+1 234 567 8901',
      age: 34,
      slotTime: '11:15 am',
      fees: 50,
      status: 'SCHEDULED',
      condition: 'Seasonal flu and respiratory consultation',
    },
    {
      id: 'apt_103',
      patientName: 'Robert Vance',
      patientPhone: '+1 345 678 9012',
      age: 52,
      slotTime: '02:00 pm',
      fees: 50,
      status: 'SCHEDULED',
      condition: 'Blood pressure medication renewal',
    },
  ]);

  const handleComplete = (id: string) => {
    setConsultations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'COMPLETED' } : c))
    );
    showToast('Consultation marked as Completed.', 'success');
  };

  const handleCancel = (id: string) => {
    setConsultations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'CANCELLED' } : c))
    );
    showToast('Consultation cancelled.', 'info');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fd] text-slate-800 pb-16 font-sans">
      <DashboardNavbar
        currentRole="DOCTOR"
        userName="Dr. Richard James"
        userSubtitle="MBBS, MD • General Physician"
        avatarUrl="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Doctor Profile Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <img
              src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300"
              alt="Dr. Richard James"
              className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-200"
            />
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Dr. Richard James</h1>
                <span className="text-blue-600 text-sm font-bold">✓</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                General Physician • 4 Years Experience • Richmond Circle Clinic
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Consultation Fee: <strong className="text-gray-800">$50 / session</strong></p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsAvailable(!isAvailable);
                showToast(`Teleconsultation Status: ${!isAvailable ? 'Online' : 'Offline'}`, 'info');
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${
                isAvailable
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
              <span>{isAvailable ? 'AVAILABLE FOR CONSULT' : 'OFFLINE'}</span>
            </button>
          </div>
        </div>

        {/* 4 Clean Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Total Consultations</p>
            <p className="text-2xl font-black text-gray-900">38</p>
            <span className="text-[10px] text-emerald-600 font-bold">+4 Scheduled Today</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Total Earnings</p>
            <p className="text-2xl font-black text-[#1e2e6e]">$1,450</p>
            <span className="text-[10px] text-emerald-600 font-bold">100% Disbursed</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Active Patients</p>
            <p className="text-2xl font-black text-gray-900">32</p>
            <span className="text-[10px] text-blue-600 font-bold">Regular Consults</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Patient Rating</p>
            <p className="text-2xl font-black text-amber-500">4.9 ★</p>
            <span className="text-[10px] text-gray-400">42 Verified Reviews</span>
          </div>
        </div>

        {/* Patient Consultations Queue */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>📋</span> Patient Consultations Queue
              </h2>
              <p className="text-xs text-gray-500">Today's clinical schedule and patient intakes</p>
            </div>
            <span className="text-xs text-gray-400">{consultations.length} Active Patients</span>
          </div>

          <div className="divide-y divide-gray-100">
            {consultations.map((item) => (
              <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                      {item.slotTime}
                    </span>
                    <h3 className="text-sm font-bold text-gray-900">{item.patientName}</h3>
                    <span className="text-xs text-gray-400">({item.age} yrs)</span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        item.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : item.status === 'CANCELLED'
                          ? 'bg-red-50 text-red-800 border border-red-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{item.condition}</p>
                  <p className="text-[11px] text-gray-400">Phone: {item.patientPhone} • Fee: ${item.fees}</p>
                </div>

                {item.status === 'SCHEDULED' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleComplete(item.id)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      ✓ Complete
                    </button>
                    <button
                      onClick={() => handleCancel(item.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold transition-all"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;
