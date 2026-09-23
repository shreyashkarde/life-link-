import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useApp } from '../../context/AppContext';

export const DoctorDashboard: React.FC = () => {
  const { dToken, backendUrl, showToast, doctorData } = useApp();
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getDoctorDashData = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${backendUrl}/api/doctor/dashboard`, {
        headers: { dtoken: dToken },
      });
      if (data.success) {
        setDashData(data.dashData);
      }
    } catch (error: any) {
      console.error('Error fetching doctor dashboard:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const completeAppointment = async (appointmentId: string) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/doctor/complete-appointment`,
        { appointmentId },
        { headers: { dtoken: dToken } }
      );
      if (data.success) {
        showToast('Appointment completed! Earnings credited.', 'success');
        getDoctorDashData();
      } else {
        showToast(data.message || 'Action failed', 'error');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error completing appointment', 'error');
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/doctor/cancel-appointment`,
        { appointmentId },
        { headers: { dtoken: dToken } }
      );
      if (data.success) {
        showToast('Appointment cancelled', 'success');
        getDoctorDashData();
      } else {
        showToast(data.message || 'Action failed', 'error');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error cancelling appointment', 'error');
    }
  };

  useEffect(() => {
    if (dToken) {
      getDoctorDashData();
    }
  }, [dToken]);

  if (loading && !dashData) {
    return (
      <div className="py-20 text-center text-gray-500">
        <p>Loading doctor dashboard...</p>
      </div>
    );
  }

  return (
    <div className="m-2 sm:m-5">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Welcome back, {doctorData?.name || 'Doctor'}
        </h1>
        <p className="text-xs text-gray-500 mt-1">Here is a summary of your consultations and patient earnings.</p>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border-2 border-emerald-100 shadow-sm hover:shadow-md hover:scale-102 transition-all">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-3xl">
            💰
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900">${dashData?.earnings || 0}</p>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-0.5">Total Earnings</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-sm hover:shadow-md hover:scale-102 transition-all">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-3xl">
            📅
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900">{dashData?.appointments || 0}</p>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-0.5">Consultations</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border-2 border-purple-100 shadow-sm hover:shadow-md hover:scale-102 transition-all">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-3xl">
            👥
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900">{dashData?.patients || 0}</p>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-0.5">Patients Seen</p>
          </div>
        </div>
      </div>

      {/* Latest Bookings */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm mt-8 overflow-hidden">
        <div className="flex items-center justify-between px-7 py-5 border-b bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📋</span>
            <h2 className="font-bold text-gray-900 text-base">Recent Patient Appointments</h2>
          </div>
          <span className="text-xs text-gray-400 font-semibold">Queue Actions</span>
        </div>

        <div className="divide-y divide-gray-100">
          {dashData?.latestAppointments && dashData.latestAppointments.length > 0 ? (
            dashData.latestAppointments.map((item: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between px-7 py-4 gap-4 hover:bg-gray-50 transition-colors text-sm"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    className="rounded-2xl w-12 h-12 object-cover border-2 border-indigo-100"
                    src={item.userData?.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt="Patient"
                  />
                  <div>
                    <p className="text-gray-900 font-bold text-base">{item.userData?.name || 'Patient'}</p>
                    <p className="text-xs text-gray-500 font-medium">
                      Slot: <span className="font-semibold text-primary">{item.slotDate?.replaceAll('_', ' / ')} at {item.slotTime}</span> •{' '}
                      Fee: <span className="text-emerald-600 font-bold">${item.amount}</span>
                    </p>
                  </div>
                </div>

                <div>
                  {item.cancelled ? (
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                      Cancelled
                    </span>
                  ) : item.isCompleted ? (
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                      Completed ✓
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => cancelAppointment(item._id)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                        title="Cancel Appointment"
                      >
                        <span>✕</span>
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={() => completeAppointment(item._id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-600 hover:text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                        title="Mark Completed"
                      >
                        <span>✓</span>
                        <span>Complete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-gray-400">No scheduled consultations right now.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
