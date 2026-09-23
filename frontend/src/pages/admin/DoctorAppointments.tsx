import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useApp } from '../../context/AppContext';

export const DoctorAppointments: React.FC = () => {
  const { dToken, backendUrl, showToast } = useApp();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const getAppointments = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${backendUrl}/api/doctor/appointments`, {
        headers: { dtoken: dToken },
      });
      if (data.success) {
        setAppointments(data.appointments);
      }
    } catch (error: any) {
      console.error('Error fetching doctor appointments:', error.message);
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
        getAppointments();
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
        getAppointments();
      } else {
        showToast(data.message || 'Action failed', 'error');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error cancelling appointment', 'error');
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob || dob === 'Not Selected') return '28';
    const birthYear = new Date(dob).getFullYear();
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear || 28;
  };

  useEffect(() => {
    if (dToken) {
      getAppointments();
    }
  }, [dToken]);

  return (
    <div className="w-full max-w-6xl m-2 sm:m-5">
      <div className="mb-6 pb-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Consultation Schedule</h1>
          <p className="text-xs text-gray-500 mt-1">
            Track booked appointments and complete consultations to release earnings.
          </p>
        </div>
        <span className="text-xs font-bold bg-indigo-50 text-primary border border-primary/30 px-3.5 py-1.5 rounded-full">
          {appointments.length} Total Bookings
        </span>
      </div>

      <div className="bg-white border-2 border-gray-100 rounded-3xl text-sm overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="max-sm:hidden grid grid-cols-[0.5fr_2fr_1.5fr_1fr_2.5fr_1fr_2fr] gap-2 py-4 px-6 border-b bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <p>#</p>
          <p>Patient</p>
          <p>Payment Mode</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Fee</p>
          <p>Actions</p>
        </div>

        {/* Rows */}
        {appointments.length > 0 ? (
          appointments.map((item, index) => (
            <div
              key={index}
              className="flex flex-wrap justify-between max-sm:gap-4 sm:grid sm:grid-cols-[0.5fr_2fr_1.5fr_1fr_2.5fr_1fr_2fr] gap-2 items-center text-gray-700 py-4 px-6 border-b border-gray-100 hover:bg-gray-50 transition-colors"
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

              <div>
                <span
                  className={`text-xs px-3 py-1 border rounded-full font-bold inline-flex items-center gap-1 ${
                    item.payment
                      ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                      : 'border-orange-300 text-orange-700 bg-orange-50'
                  }`}
                >
                  <span>{item.payment ? '💳' : '💵'}</span>
                  <span>{item.payment ? 'Online (Paid)' : 'Pay Cash'}</span>
                </span>
              </div>

              <p className="max-sm:hidden font-semibold text-gray-600">{calculateAge(item.userData?.dob)} yrs</p>

              <div>
                <p className="font-bold text-xs text-gray-900">
                  {item.slotDate?.replaceAll('_', ' / ')}
                </p>
                <p className="text-xs text-primary font-semibold">{item.slotTime}</p>
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => completeAppointment(item._id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      <span>✓</span>
                      <span>Complete</span>
                    </button>
                    <button
                      onClick={() => cancelAppointment(item._id)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      <span>✕</span>
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center text-gray-400">No appointments in queue.</div>
        )}
      </div>
    </div>
  );
};

export default DoctorAppointments;
