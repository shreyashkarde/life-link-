import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export const TopDoctors: React.FC = () => {
  const navigate = useNavigate();
  const { doctors } = useApp();

  return (
    <div className="flex flex-col items-center gap-4 my-16 text-gray-900 md:mx-10">
      <h1 className="text-3xl font-bold">Top Doctors to Book</h1>
      <p className="sm:w-1/3 text-center text-sm text-gray-500">
        Simply browse through our extensive list of trusted doctors.
      </p>

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pt-5 gap-y-6 px-3 sm:px-0">
        {doctors.slice(0, 10).map((item, index) => (
          <div
            key={index}
            onClick={() => {
              navigate(`/appointment/${item._id}`);
              window.scrollTo(0, 0);
            }}
            className="border-2 border-gray-100 hover:border-primary/40 rounded-2xl overflow-hidden cursor-pointer hover:translate-y-[-6px] transition-all duration-300 shadow-sm hover:shadow-lg bg-white flex flex-col justify-between"
          >
            <div>
              <div className="bg-gradient-to-b from-blue-50 to-indigo-50/50 flex items-center justify-center h-52 overflow-hidden relative">
                <img
                  className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
                  src={item.image}
                  alt={item.name}
                />
                <span className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-xs font-bold text-gray-800 shadow-sm">
                  ${item.fees}
                </span>
              </div>
              <div className="p-4">
                <div
                  className={`flex items-center gap-2 text-sm text-center ${
                    item.available !== false ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  <p
                    className={`w-2 h-2 ${
                      item.available !== false ? 'bg-green-500' : 'bg-gray-400'
                    } rounded-full animate-pulse`}
                  ></p>
                  <p className="font-bold text-xs uppercase tracking-wider">
                    {item.available !== false ? 'Available' : 'Unavailable'}
                  </p>
                </div>
                <p className="text-gray-900 text-lg font-bold mt-1 line-clamp-1">{item.name}</p>
                <p className="text-gray-500 text-xs font-medium">{item.speciality}</p>
                <p className="text-gray-400 text-[11px] mt-0.5">{item.degree} • {item.experience}</p>
              </div>
            </div>

            {/* Prominent Action Button */}
            <div className="px-4 pb-4 pt-1">
              <button
                type="button"
                className="w-full py-2.5 bg-primary hover:bg-[#4a58eb] text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-primary/30 active:scale-95 cursor-pointer"
              >
                <span>Book Appointment</span>
                <span className="text-sm">→</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Prominent More Doctors Button */}
      <button
        onClick={() => {
          navigate('/doctors');
          window.scrollTo(0, 0);
        }}
        className="bg-primary hover:bg-[#4a58eb] text-white px-14 py-3.5 rounded-full mt-10 transition-all font-bold shadow-lg hover:shadow-primary/30 hover:scale-105 text-sm flex items-center gap-2"
      >
        <span>View All Doctors</span>
        <span>→</span>
      </button>
    </div>
  );
};

export default TopDoctors;
