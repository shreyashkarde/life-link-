import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { DoctorItem } from '../assets/assets';

export const Doctors: React.FC = () => {
  const { speciality } = useParams<{ speciality?: string }>();
  const [filterDoc, setFilterDoc] = useState<DoctorItem[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const navigate = useNavigate();
  const { doctors } = useApp();

  const specialitiesList = [
    { name: 'General physician', icon: '🩺' },
    { name: 'Gynecologist', icon: '🌸' },
    { name: 'Dermatologist', icon: '✨' },
    { name: 'Pediatricians', icon: '👶' },
    { name: 'Neurologist', icon: '🧠' },
    { name: 'Gastroenterologist', icon: '🍎' },
  ];

  const applyFilter = () => {
    if (speciality) {
      setFilterDoc(doctors.filter((doc) => doc.speciality === speciality));
    } else {
      setFilterDoc(doctors);
    }
  };

  useEffect(() => {
    applyFilter();
  }, [doctors, speciality]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Find Specialists</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Browse through our verified medical specialists and book your consultation.
          </p>
        </div>
        {speciality && (
          <button
            onClick={() => navigate('/doctors')}
            className="text-xs bg-rose-50 text-rose-600 border border-rose-200 px-3.5 py-1.5 rounded-full font-bold self-start sm:self-auto mt-2 sm:mt-0 hover:bg-rose-100 transition-colors"
          >
            Clear Filter ✕
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-6 mt-6">
        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`py-2 px-5 border-2 rounded-xl text-xs font-bold transition-all sm:hidden flex items-center gap-2 ${
            showFilter ? 'bg-primary text-white border-primary' : 'text-gray-700 bg-gray-50 border-gray-300'
          }`}
        >
          <span>⚡</span>
          <span>{showFilter ? 'Hide Filters' : 'Filter by Speciality'}</span>
        </button>

        {/* Sidebar Filter Buttons */}
        <div
          className={`flex-col gap-2.5 text-sm text-gray-700 ${
            showFilter ? 'flex' : 'hidden sm:flex'
          } min-w-[220px] w-full sm:w-auto`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1 mb-1 hidden sm:block">
            Specialities
          </p>
          {specialitiesList.map((item, index) => (
            <button
              key={index}
              onClick={() =>
                speciality === item.name ? navigate('/doctors') : navigate(`/doctors/${item.name}`)
              }
              className={`w-full text-left px-4 py-3 border-2 rounded-2xl transition-all cursor-pointer font-semibold flex items-center justify-between ${
                speciality === item.name
                  ? 'bg-primary text-white border-primary shadow-md scale-102'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-primary/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">{item.icon}</span>
                <span className="text-xs font-bold">{item.name}</span>
              </div>
              <span className={`text-xs ${speciality === item.name ? 'text-white' : 'text-gray-400'}`}>
                →
              </span>
            </button>
          ))}
        </div>

        {/* Doctors Grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
          {filterDoc.length > 0 ? (
            filterDoc.map((item, index) => (
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
                  <div className="p-5">
                    <div
                      className={`flex items-center gap-2 text-sm ${
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
                    <p className="text-primary font-bold text-xs">{item.speciality}</p>
                    <p className="text-gray-400 text-xs mt-1 line-clamp-2">{item.about}</p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-1">
                  <button
                    type="button"
                    className="w-full py-2.5 bg-primary hover:bg-[#4a58eb] text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-primary/30 active:scale-95 cursor-pointer"
                  >
                    <span>Book Appointment</span>
                    <span className="text-sm">→</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
              <p className="text-xl font-bold text-gray-700">No doctors found</p>
              <p className="text-sm text-gray-400 mt-1">There are currently no specialists under this category.</p>
              <button
                onClick={() => navigate('/doctors')}
                className="mt-4 bg-primary text-white px-6 py-2 rounded-full font-bold text-xs shadow-md"
              >
                View All Doctors
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Doctors;
