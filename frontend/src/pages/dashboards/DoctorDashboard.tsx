import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../../context/AppContext';
import DashboardNavbar from '../../components/DashboardNavbar';

export const DoctorDashboard: React.FC = () => {
  const { showToast, backendUrl, dToken, doctorData } = useApp();
  const [isAvailable, setIsAvailable] = useState(true);
  const [dashData, setDashData] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDoctorDashboardData = async () => {
    try {
      setLoading(true);
      const token = dToken || sessionStorage.getItem('dToken') || localStorage.getItem('token') || '';
      const { data } = await axios.get(`${backendUrl}/api/doctor/dashboard`, {
        headers: { dtoken: token, token },
      });
      if (data.success && data.dashData) {
        setDashData(data.dashData);
        if (Array.isArray(data.dashData.latestAppointments)) {
          setConsultations(data.dashData.latestAppointments);
        }
      }
    } catch (error: any) {
      console.error('Doctor Dashboard Fetch Error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorDashboardData();
  }, [dToken, backendUrl]);

  const handleComplete = async (id: string) => {
    try {
      const token = dToken || sessionStorage.getItem('dToken') || localStorage.getItem('token') || '';
      const { data } = await axios.post(
        `${backendUrl}/api/doctor/complete-appointment`,
        { appointmentId: id },
        { headers: { dtoken: token, token } }
      );
      if (data.success) {
        showToast('Consultation marked as Completed.', 'success');
        fetchDoctorDashboardData();
      } else {
        showToast(data.message || 'Action failed', 'error');
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Error completing consultation', 'error');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const token = dToken || sessionStorage.getItem('dToken') || localStorage.getItem('token') || '';
      const { data } = await axios.post(
        `${backendUrl}/api/doctor/cancel-appointment`,
        { appointmentId: id },
        { headers: { dtoken: token, token } }
      );
      if (data.success) {
        showToast('Consultation cancelled.', 'info');
        fetchDoctorDashboardData();
      } else {
        showToast(data.message || 'Action failed', 'error');
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Error cancelling consultation', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fd] text-slate-800 pb-16 font-sans">
      <DashboardNavbar
        currentRole="DOCTOR"
        userName={doctorData?.name || 'Dr. Richard James'}
        userSubtitle={`${doctorData?.speciality || 'General Physician'} • Prescripto Certified`}
        avatarUrl={doctorData?.image || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300'}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Doctor Profile Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <img
              src={doctorData?.image || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300'}
              alt={doctorData?.name || 'Doctor'}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-200"
            />
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">{doctorData?.name || 'Dr. Richard James'}</h1>
                <span className="text-blue-600 text-sm font-bold">✓</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                {doctorData?.speciality || 'General Physician'} • Verified Practitioner
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Consultation Fee: <strong className="text-gray-800">${doctorData?.fees || 50} / session</strong></p>
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
            <p className="text-2xl font-black text-gray-900">{dashData?.appointments ?? consultations.length}</p>
            <span className="text-[10px] text-emerald-600 font-bold">Live Synced</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Total Earnings</p>
            <p className="text-2xl font-black text-[#1e2e6e]">${dashData?.earnings ?? 0}</p>
            <span className="text-[10px] text-emerald-600 font-bold">Realtime Balance</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Active Patients</p>
            <p className="text-2xl font-black text-gray-900">{dashData?.patients ?? 0}</p>
            <span className="text-[10px] text-blue-600 font-bold">Unique Patients</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-gray-400">Practitioner Rating</p>
            <p className="text-2xl font-black text-amber-500">5.0 ★</p>
            <span className="text-[10px] text-gray-400">Verified System Profile</span>
          </div>
        </div>

        {/* Patient Consultations Queue */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>📋</span> Patient Consultations Queue
              </h2>
              <p className="text-xs text-gray-500">Clinical schedule and patient bookings from database</p>
            </div>
            <span className="text-xs text-gray-400">{consultations.length} Active Patients</span>
          </div>

          <div className="divide-y divide-gray-100">
            {consultations && consultations.length > 0 ? (
              consultations.map((item: any) => (
                <div key={item._id || item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                        {item.slotTime}
                      </span>
                      <h3 className="text-sm font-bold text-gray-900">{item.userData?.name || item.patientName || 'Patient'}</h3>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          item.isCompleted || item.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : item.cancelled || item.status === 'CANCELLED'
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {item.isCompleted ? 'COMPLETED' : item.cancelled ? 'CANCELLED' : 'SCHEDULED'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">Date: {item.slotDate?.replace(/_/g, ' / ')}</p>
                    <p className="text-[11px] text-gray-400">Phone: {item.userData?.phone || 'N/A'} • Fee: ${item.amount || item.fees || 50}</p>
                  </div>

                  {!item.isCompleted && !item.cancelled && item.status !== 'COMPLETED' && item.status !== 'CANCELLED' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleComplete(item._id || item.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        ✓ Complete
                      </button>
                      <button
                        onClick={() => handleCancel(item._id || item.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-gray-400 bg-slate-50/50 rounded-2xl border border-dashed border-gray-200 space-y-1">
                <p className="text-xs font-semibold text-gray-500">No scheduled consultations right now.</p>
                <p className="text-[11px] text-gray-400">New patient bookings will appear here automatically.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;
