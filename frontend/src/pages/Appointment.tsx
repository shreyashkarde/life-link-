import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import { DoctorItem } from '../assets/assets';
import RelatedDoctors from '../components/RelatedDoctors';

export const Appointment: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const { doctors, currencySymbol, backendUrl, token, getDoctorsData, showToast } = useApp();
  const navigate = useNavigate();

  const [docInfo, setDocInfo] = useState<DoctorItem | null>(null);
  const [docSlots, setDocSlots] = useState<{ datetime: Date; time: string; booked: boolean }[][]>([]);
  const [slotIndex, setSlotIndex] = useState(0);
  const [slotTime, setSlotTime] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const fetchDocInfo = () => {
    const doc = doctors.find((item) => item._id === docId);
    if (doc) {
      setDocInfo(doc);
    }
  };

  // Generate 7-day slot schedule matching Prescripto
  const getAvailableSlots = () => {
    setDocSlots([]);
    const today = new Date();

    const allDaysSlots: { datetime: Date; time: string; booked: boolean }[][] = [];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);

      const dayNumber = currentDate.getDate();
      const monthNumber = currentDate.getMonth() + 1;
      const yearNumber = currentDate.getFullYear();
      const slotDateFormat = `${dayNumber}_${monthNumber}_${yearNumber}`;

      const timeOptions = [
        '10:00 am',
        '10:30 am',
        '11:00 am',
        '11:30 am',
        '12:00 pm',
        '12:30 pm',
        '04:30 pm',
        '05:00 pm',
        '05:30 pm',
        '06:00 pm',
        '06:30 pm',
        '07:00 pm',
        '07:30 pm',
        '08:00 pm',
      ];

      const bookedSlots = docInfo?.slots_booked?.[slotDateFormat] || [];

      const timeSlots = timeOptions.map((timeStr) => {
        return {
          datetime: new Date(currentDate),
          time: timeStr,
          booked: bookedSlots.includes(timeStr),
        };
      });

      allDaysSlots.push(timeSlots);
    }

    setDocSlots(allDaysSlots);
  };

  useEffect(() => {
    fetchDocInfo();
  }, [doctors, docId]);

  useEffect(() => {
    if (docInfo) {
      getAvailableSlots();
    }
  }, [docInfo]);

  const bookAppointment = async () => {
    if (!token) {
      showToast('Please login to book an appointment', 'info');
      navigate('/login');
      return;
    }

    if (!slotTime) {
      showToast('Please select a time slot', 'error');
      return;
    }

    try {
      setIsBooking(true);
      const date = docSlots[slotIndex][0].datetime;
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const slotDate = `${day}_${month}_${year}`;

      const { data } = await axios.post(
        `${backendUrl}/api/user/book-appointment`,
        { docId, slotDate, slotTime },
        { headers: { token } }
      );

      if (data.success) {
        showToast('Appointment booked successfully!', 'success');
        await getDoctorsData();
        navigate('/my-appointments');
      } else {
        showToast(data.message || 'Slot already booked', 'error');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to book appointment', 'error');
    } finally {
      setIsBooking(false);
    }
  };

  if (!docInfo) {
    return (
      <div className="py-20 text-center text-gray-500">
        <p>Loading doctor profile...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Doctor Overview Card */}
      <div className="flex flex-col sm:flex-row gap-6 mt-4">
        <div className="bg-gradient-to-b from-primary to-indigo-700 w-full sm:max-w-72 rounded-3xl overflow-hidden shadow-lg flex items-center justify-center p-2">
          <img
            className="w-full h-auto object-cover object-top max-h-80 rounded-2xl"
            src={docInfo.image}
            alt={docInfo.name}
          />
        </div>

        <div className="flex-1 border-2 border-gray-100 rounded-3xl p-8 bg-white shadow-sm flex flex-col justify-between">
          <div>
            {/* Doctor Name & Verified Badge */}
            <div className="flex items-center gap-2.5 text-2xl sm:text-3xl font-bold text-gray-900">
              <p>{docInfo.name}</p>
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shadow-sm">
                ✓
              </div>
            </div>

            {/* Speciality & Experience */}
            <div className="flex flex-wrap items-center gap-2.5 text-sm mt-2 text-gray-600">
              <p className="font-semibold text-primary">
                {docInfo.degree} - {docInfo.speciality}
              </p>
              <span className="py-0.5 px-3 border border-gray-300 bg-gray-50 text-xs rounded-full font-bold text-gray-700">
                {docInfo.experience} Experience
              </span>
            </div>

            {/* About Doctor */}
            <div className="mt-5">
              <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                <p>About Doctor</p>
                <span className="text-gray-400 text-xs">ℹ</span>
              </div>
              <p className="text-sm text-gray-500 max-w-[700px] mt-1.5 leading-6">
                {docInfo.about}
              </p>
            </div>
          </div>

          {/* Appointment Fee */}
          <div className="pt-6 border-t border-gray-100 mt-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Consultation Fee</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">
                {currencySymbol}
                {docInfo.fees}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                Verified Doctor
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Slots Section */}
      <div className="mt-10 p-6 sm:p-8 bg-white border-2 border-gray-100 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Booking Slots</h2>
            <p className="text-xs text-gray-500 mt-0.5">Select a convenient date and time for your consultation.</p>
          </div>
          {slotTime && (
            <span className="text-xs font-bold bg-indigo-50 text-primary border border-primary/30 px-3 py-1 rounded-full">
              Selected: {docSlots[slotIndex]?.[0]?.datetime.getDate()} {daysOfWeek[docSlots[slotIndex]?.[0]?.datetime.getDay()]} at {slotTime}
            </span>
          )}
        </div>

        {/* Days Carousel */}
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">1. Choose Date</p>
        <div className="flex gap-3 items-center w-full overflow-x-auto no-scrollbar py-2">
          {docSlots.length > 0 &&
            docSlots.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setSlotIndex(index);
                  setSlotTime('');
                }}
                className={`text-center py-4 px-4 min-w-20 rounded-2xl cursor-pointer transition-all duration-200 border-2 font-bold ${
                  slotIndex === index
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-105'
                    : 'bg-gray-50 border-gray-200 hover:border-primary/50 text-gray-700'
                }`}
              >
                <p className="text-xs">{item[0] && daysOfWeek[item[0].datetime.getDay()]}</p>
                <p className="text-xl font-extrabold mt-1">{item[0] && item[0].datetime.getDate()}</p>
              </button>
            ))}
        </div>

        {/* Time Slots Carousel */}
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mt-6 mb-2">2. Choose Time Slot</p>
        <div className="flex flex-wrap items-center gap-3 w-full py-2">
          {docSlots.length > 0 &&
            docSlots[slotIndex]?.map((item, index) => (
              <button
                key={index}
                type="button"
                disabled={item.booked}
                onClick={() => setSlotTime(item.time)}
                className={`text-xs font-bold px-5 py-3 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                  item.booked
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through opacity-60'
                    : item.time === slotTime
                    ? 'bg-primary text-white border-primary shadow-md scale-105'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary shadow-sm'
                }`}
              >
                {item.time}
              </button>
            ))}
        </div>

        {/* Action Button */}
        <div className="pt-6 mt-4 border-t border-gray-100">
          <button
            onClick={bookAppointment}
            disabled={isBooking}
            className="w-full sm:w-auto bg-primary hover:bg-[#4a58eb] text-white text-base font-bold px-12 py-4 rounded-full transition-all shadow-xl hover:shadow-primary/30 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
          >
            <span>{isBooking ? 'Securing Consultation...' : 'Confirm & Book Appointment'}</span>
            <span className="text-lg">→</span>
          </button>
        </div>
      </div>

      {/* Related Doctors */}
      <RelatedDoctors docId={docId || ''} speciality={docInfo.speciality} />
    </div>
  );
};

export default Appointment;
