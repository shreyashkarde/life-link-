import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../services/apiClient';
import { socketService } from '../../services/socket';

export const AdminDashboard: React.FC = () => {
  const { aToken, backendUrl, showToast, refreshVersion } = useApp();
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getDashData = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/api/admin/dashboard');
      if (data.success && data.dashData) {
        setDashData(data.dashData);
      }
    } catch (error: any) {
      console.error('Error fetching admin dashboard:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const { data } = await apiClient.post('/api/admin/cancel-appointment', { appointmentId });
      if (data.success) {
        showToast('Appointment cancelled by admin', 'success');
        getDashData();
      } else {
        showToast(data.message || 'Action failed', 'error');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error cancelling appointment', 'error');
    }
  };

  useEffect(() => {
    if (aToken) {
      getDashData();
    }

    socketService.connect();
    socketService.joinAdmin();

    const unsubCleared = socketService.onDataCleared(() => {
      console.log('🧹 [AdminDashboard] DB Cleared event received. Resetting state...');
      setDashData({ doctors: 0, appointments: 0, patients: 0, latestAppointments: [] });
      if (aToken) getDashData();
    });

    const unsubNewAppt = socketService.onNewAppointment(() => {
      if (aToken) getDashData();
    });

    const unsubUpdated = socketService.onAppointmentUpdated(() => {
      if (aToken) getDashData();
    });

    const unsubCancelled = socketService.onAppointmentCancelled(() => {
      if (aToken) getDashData();
    });

    return () => {
      if (typeof unsubCleared === 'function') unsubCleared();
      if (typeof unsubNewAppt === 'function') unsubNewAppt();
      if (typeof unsubUpdated === 'function') unsubUpdated();
      if (typeof unsubCancelled === 'function') unsubCancelled();
    };
  }, [aToken, refreshVersion]);

  if (loading && !dashData) {
    return (
      <div className="py-20 text-center text-gray-500">
        <p>Loading dashboard metrics...</p>
      </div>
    );
  }

  return (
    <div className="m-2 sm:m-5">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Admin Overview</h1>
        <p className="text-xs text-gray-500 mt-1">Platform performance metrics and recent patient bookings.</p>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border-2 border-indigo-100 shadow-sm hover:shadow-md hover:scale-102 transition-all">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-3xl">
            👨‍⚕️
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900">{dashData?.doctors || 0}</p>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-0.5">Total Doctors</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-sm hover:shadow-md hover:scale-102 transition-all">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-3xl">
            📅
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900">{dashData?.appointments || 0}</p>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-0.5">Appointments</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border-2 border-emerald-100 shadow-sm hover:shadow-md hover:scale-102 transition-all">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-3xl">
            👥
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900">{dashData?.patients || 0}</p>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-0.5">Total Patients</p>
          </div>
        </div>
      </div>

      {/* Latest Bookings Section */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm mt-8 overflow-hidden">
        <div className="flex items-center justify-between px-7 py-5 border-b bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📋</span>
            <h2 className="font-bold text-gray-900 text-base">Latest Bookings</h2>
          </div>
          <span className="text-xs text-gray-400 font-semibold">Live System Activity</span>
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
                    src={item.docData?.image}
                    alt={item.docData?.name}
                  />
                  <div>
                    <p className="text-gray-900 font-bold text-base">{item.docData?.name}</p>
                    <p className="text-xs text-gray-500 font-medium">
                      Patient: <span className="font-semibold text-gray-700">{item.userData?.name || 'Walk-in'}</span> •{' '}
                      Booking on <span className="text-primary font-bold">{item.slotDate?.replace(/_/g, ' / ')} at {item.slotTime}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-gray-800">${item.amount}</span>
                  {item.cancelled ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                      Cancelled
                    </span>
                  ) : item.isCompleted ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                      Completed
                    </span>
                  ) : (
                    <button
                      onClick={() => cancelAppointment(item._id)}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1"
                      title="Cancel Appointment"
                    >
                      <span>✕</span>
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-gray-400">No appointments recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
