import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../services/apiClient';
import { socketService } from '../../services/socket';

export const AllAppointments: React.FC = () => {
  const { aToken, backendUrl, showToast, refreshVersion } = useApp();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const getAllAppointments = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/api/admin/appointments');
      if (data.success && Array.isArray(data.appointments)) {
        setAppointments(data.appointments);
      } else {
        setAppointments([]);
      }
    } catch (error: any) {
      console.error('Error fetching all appointments:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const { data } = await apiClient.post('/api/admin/cancel-appointment', { appointmentId });
      if (data.success) {
        showToast('Appointment cancelled by administrator', 'success');
        getAllAppointments();
      } else {
        showToast(data.message || 'Action failed', 'error');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error cancelling appointment', 'error');
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob || dob === 'Not Selected') return '26';
    const birthYear = new Date(dob).getFullYear();
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear || 26;
  };

  useEffect(() => {
    if (aToken) {
      getAllAppointments();
    }

    socketService.connect();
    socketService.joinAdmin();

    const unsubCleared = socketService.onDataCleared(() => {
      console.log('🧹 [AllAppointments] DB Cleared event received. Resetting state...');
      setAppointments([]);
      if (aToken) getAllAppointments();
    });

    const unsubNewAppt = socketService.onNewAppointment(() => {
      if (aToken) getAllAppointments();
    });

    const unsubUpdated = socketService.onAppointmentUpdated(() => {
      if (aToken) getAllAppointments();
    });

    const unsubCancelled = socketService.onAppointmentCancelled(() => {
      if (aToken) getAllAppointments();
    });

    return () => {
      if (typeof unsubCleared === 'function') unsubCleared();
      if (typeof unsubNewAppt === 'function') unsubNewAppt();
      if (typeof unsubUpdated === 'function') unsubUpdated();
      if (typeof unsubCancelled === 'function') unsubCancelled();
    };
  }, [aToken, refreshVersion]);

  return (
    <div className="w-full max-w-6xl m-2 sm:m-5">
      <div className="mb-6 pb-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Master Appointments Directory</h1>
          <p className="text-xs text-gray-500 mt-1">Platform-wide overview of all scheduled medical appointments.</p>
        </div>
        <span className="text-xs font-bold bg-indigo-50 text-primary border border-primary/30 px-3.5 py-1.5 rounded-full">
          {appointments.length} Total Bookings
        </span>
      </div>

      <div className="bg-white border-2 border-gray-100 rounded-3xl text-sm overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1.5fr] grid-flow-col py-4 px-6 border-b bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <p>#</p>
          <p>Patient</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Doctor</p>
          <p>Fee</p>
          <p>Action</p>
        </div>

        {/* Table Rows */}
        {appointments.length > 0 ? (
          appointments.map((item, index) => (
            <div
              key={index}
              className="flex flex-wrap justify-between max-sm:gap-3 sm:grid sm:grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1.5fr] items-center text-gray-700 py-4 px-6 border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <p className="max-sm:hidden font-bold text-gray-400">{index + 1}</p>

              <div className="flex items-center gap-3">
                <img
                  className="w-10 h-10 rounded-2xl object-cover border"
                  src={item.userData?.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                  alt="Patient"
                />
                <div>
                  <p className="font-bold text-gray-900">{item.userData?.name || 'Patient'}</p>
                  <p className="text-[11px] text-gray-400 font-medium">{item.userData?.phone || 'No phone'}</p>
                </div>
              </div>

              <p className="max-sm:hidden font-semibold text-gray-600">{calculateAge(item.userData?.dob)} yrs</p>

              <div>
                <p className="font-bold text-xs text-gray-900">
                  {item.slotDate?.replace(/_/g, ' / ')}
                </p>
                <p className="text-xs text-primary font-semibold">{item.slotTime}</p>
              </div>

              <div className="flex items-center gap-3">
                <img
                  className="w-10 h-10 rounded-2xl object-cover bg-indigo-50 border-2 border-indigo-100"
                  src={item.docData?.image}
                  alt="Doctor"
                />
                <div>
                  <p className="font-bold text-gray-900">{item.docData?.name}</p>
                  <p className="text-[11px] text-primary font-semibold">{item.docData?.speciality}</p>
                </div>
              </div>

              <p className="font-black text-base text-gray-900">${item.amount}</p>

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
                  <button
                    onClick={() => cancelAppointment(item._id)}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1 cursor-pointer"
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
          <div className="py-20 text-center text-gray-400">No appointments found in the system.</div>
        )}
      </div>
    </div>
  );
};

export default AllAppointments;
