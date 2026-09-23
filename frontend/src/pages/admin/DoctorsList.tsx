import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useApp } from '../../context/AppContext';

export const DoctorsList: React.FC = () => {
  const { aToken, backendUrl, showToast, getDoctorsData } = useApp();
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const getAllDoctors = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${backendUrl}/api/admin/all-doctors`, {
        headers: { atoken: aToken },
      });
      if (data.success) {
        setDoctorsList(data.doctors);
      }
    } catch (error: any) {
      console.error('Error fetching doctors list:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const changeAvailability = async (docId: string) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/change-availability`,
        { docId },
        { headers: { atoken: aToken } }
      );
      if (data.success) {
        showToast(data.message || 'Availability updated', 'success');
        getAllDoctors();
        getDoctorsData(); // Sync public catalogue as well
      } else {
        showToast(data.message || 'Failed to update', 'error');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error updating availability', 'error');
    }
  };

  useEffect(() => {
    if (aToken) {
      getAllDoctors();
    }
  }, [aToken]);

  return (
    <div className="m-2 sm:m-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Doctor Fleet Directory</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage physician profiles and instantly toggle patient booking availability.
          </p>
        </div>
        <span className="text-xs font-bold bg-indigo-50 text-primary border border-primary/30 px-3.5 py-1.5 rounded-full mt-2 sm:mt-0 self-start sm:self-auto">
          {doctorsList.length} Registered Doctors
        </span>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500">
          <p>Loading doctors list...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {doctorsList.map((item, index) => (
            <div
              key={index}
              className="border-2 border-gray-100 hover:border-primary/40 rounded-3xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="bg-gradient-to-b from-blue-50 to-indigo-50/50 h-52 overflow-hidden flex items-center justify-center relative">
                  <img
                    className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
                    src={item.image}
                    alt={item.name}
                  />
                  <span className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-xs font-bold text-gray-800 shadow-sm">
                    ${item.fees} Fee
                  </span>
                </div>

                <div className="p-5">
                  <p className="text-gray-900 text-lg font-bold line-clamp-1">{item.name}</p>
                  <p className="text-primary font-bold text-xs mt-0.5">{item.speciality}</p>
                  <p className="text-gray-400 text-xs mt-1">{item.degree} • {item.experience}</p>
                </div>
              </div>

              {/* Interactive Availability Toggle Card */}
              <div className="px-5 pb-5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => changeAvailability(item._id)}
                  className={`w-full py-2.5 px-4 rounded-2xl font-bold text-xs transition-all flex items-center justify-between border-2 cursor-pointer ${
                    item.available !== false
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        item.available !== false ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                      }`}
                    ></span>
                    <span>{item.available !== false ? 'Booking: Available' : 'Booking: Offline'}</span>
                  </div>
                  <span className="text-[11px] underline">Toggle ⇄</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorsList;
