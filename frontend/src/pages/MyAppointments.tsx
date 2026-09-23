import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';

export const MyAppointments: React.FC = () => {
  const { backendUrl, token, showToast, getDoctorsData } = useApp();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [payingApptId, setPayingApptId] = useState<string | null>(null);

  const getUserAppointments = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${backendUrl}/api/user/appointments`, {
        headers: { token },
      });
      if (data.success) {
        setAppointments(data.appointments);
      }
    } catch (error: any) {
      console.error('Error fetching appointments:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/cancel-appointment`,
        { appointmentId },
        { headers: { token } }
      );
      if (data.success) {
        showToast('Appointment cancelled successfully', 'success');
        getUserAppointments();
        getDoctorsData();
      } else {
        showToast(data.message || 'Could not cancel', 'error');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error cancelling appointment', 'error');
    }
  };

  const completePayment = async (appointmentId: string, method: string) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/payment-complete`,
        { appointmentId, paymentMethod: method },
        { headers: { token } }
      );
      if (data.success) {
        showToast(data.message || 'Payment successful!', 'success');
        setPayingApptId(null);
        getUserAppointments();
      } else {
        showToast(data.message || 'Payment failed', 'error');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Payment failed', 'error');
    }
  };

  useEffect(() => {
    if (token) {
      getUserAppointments();
    }
  }, [token]);

  return (
    <div>
      <div className="pb-4 mt-8 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Scheduled Appointments</h1>
          <p className="text-xs text-gray-500 mt-1">Review upcoming consultations, pay online, or reschedule.</p>
        </div>
        <span className="text-xs font-bold bg-indigo-50 text-primary border border-primary/30 px-3.5 py-1.5 rounded-full">
          {appointments.length} Consultations
        </span>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500">
          <p>Loading appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="py-20 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200 mt-6">
          <p className="text-lg font-bold text-gray-700">No appointments scheduled</p>
          <p className="text-xs text-gray-400 mt-1">You haven't booked any medical consultations yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 mt-2">
          {appointments.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-6 border-b border-gray-100 items-center justify-between"
            >
              <div className="flex gap-4 items-center">
                <img
                  className="w-28 sm:w-32 h-32 sm:h-36 object-cover object-top bg-gradient-to-b from-blue-50 to-indigo-50 rounded-2xl border-2 border-indigo-100 shadow-sm"
                  src={item.docData?.image}
                  alt={item.docData?.name}
                />
                <div className="flex-1 text-sm text-zinc-600">
                  <p className="text-gray-900 font-extrabold text-lg sm:text-xl">{item.docData?.name}</p>
                  <p className="text-primary font-bold text-xs">{item.docData?.speciality}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    <p className="font-semibold text-gray-700">Clinic Location:</p>
                    <p>{item.docData?.address?.line1}, {item.docData?.address?.line2}</p>
                  </div>
                  <div className="mt-3 inline-block bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
                    <p className="text-xs font-bold text-gray-900">
                      📅 {item.slotDate?.replaceAll('_', ' / ')} at {item.slotTime}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons Column */}
              <div className="flex flex-col gap-2.5 justify-end text-sm min-w-48">
                <div className="text-right mb-1">
                  <span className="text-xs text-gray-400">Consultation Fee: </span>
                  <span className="text-base font-black text-gray-900">${item.amount}</span>
                </div>

                {!item.cancelled && !item.isCompleted && !item.payment && (
                  <button
                    onClick={() => setPayingApptId(item._id)}
                    className="w-full py-2.5 px-4 bg-primary hover:bg-[#4a58eb] text-white rounded-xl font-bold text-xs transition-all shadow-md hover:shadow-primary/30 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>💳</span>
                    <span>Pay Online</span>
                  </button>
                )}

                {!item.cancelled && !item.isCompleted && item.payment && (
                  <div className="w-full py-2.5 px-4 border-2 border-emerald-500 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5">
                    <span>✓</span>
                    <span>Paid Online</span>
                  </div>
                )}

                {!item.cancelled && !item.isCompleted && (
                  <button
                    onClick={() => cancelAppointment(item._id)}
                    className="w-full py-2.5 px-4 border-2 border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>✕</span>
                    <span>Cancel Appointment</span>
                  </button>
                )}

                {item.cancelled && (
                  <div className="w-full py-2.5 px-4 border-2 border-red-300 rounded-xl text-red-600 font-bold text-xs bg-red-50 text-center">
                    Appointment Cancelled
                  </div>
                )}

                {item.isCompleted && (
                  <div className="w-full py-2.5 px-4 border-2 border-emerald-400 rounded-xl text-emerald-700 font-bold text-xs bg-emerald-50 text-center">
                    Completed ✓
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Gateway Modal */}
      {payingApptId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in border border-gray-100">
            <div className="flex justify-between items-center pb-4 border-b">
              <div className="flex items-center gap-2">
                <span className="text-xl">💳</span>
                <h3 className="text-lg font-black text-gray-900">Select Payment Method</h3>
              </div>
              <button
                onClick={() => setPayingApptId(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Choose your preferred secure gateway to confirm your consultation fee.
            </p>

            <div className="flex flex-col gap-3 mt-5">
              <button
                onClick={() => completePayment(payingApptId, 'Razorpay')}
                className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-blue-50/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                    R
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900 group-hover:text-primary">Razorpay</p>
                    <p className="text-xs text-gray-500">UPI, NetBanking, Debit/Credit Card</p>
                  </div>
                </div>
                <span className="text-xs text-primary font-bold">Pay Now →</span>
              </button>

              <button
                onClick={() => completePayment(payingApptId, 'Stripe')}
                className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-blue-50/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                    S
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900 group-hover:text-primary">Stripe</p>
                    <p className="text-xs text-gray-500">Global Credit & Debit Cards</p>
                  </div>
                </div>
                <span className="text-xs text-primary font-bold">Pay Now →</span>
              </button>

              <button
                onClick={() => completePayment(payingApptId, 'Cash at Clinic')}
                className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                    $
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900 group-hover:text-emerald-700">Pay at Clinic</p>
                    <p className="text-xs text-gray-500">Pay cash upon arrival</p>
                  </div>
                </div>
                <span className="text-xs text-emerald-700 font-bold">Confirm →</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAppointments;
