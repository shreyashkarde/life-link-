import React from 'react';
import { Link } from 'react-router-dom';
import { specialityData } from '../assets/assets';

export const SpecialityMenu: React.FC = () => {
  return (
    <div id="speciality" className="flex flex-col items-center gap-4 py-16 text-gray-800">
      {/* Category Pill Tag */}
      <span className="px-3.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200 uppercase tracking-wider">
        Clinical Disciplines
      </span>

      <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight text-center">
        Find Doctor by Speciality
      </h2>
      <p className="sm:w-1/2 text-center text-xs sm:text-sm text-gray-500 max-w-lg leading-relaxed">
        Browse verified specialists across 6 core disciplines. Book in-clinic or online teleconsultations in seconds.
      </p>

      {/* Specialities Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-6 w-full px-2 sm:px-0">
        {specialityData.map((item, index) => (
          <Link
            key={index}
            onClick={() => window.scrollTo(0, 0)}
            to={`/doctors/${item.speciality}`}
            className="group bg-white hover:bg-gradient-to-b hover:from-white hover:to-blue-50/50 p-5 rounded-3xl border border-gray-100 hover:border-blue-300 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center cursor-pointer hover:-translate-y-2"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-50 group-hover:bg-blue-100/60 flex items-center justify-center p-3 mb-3 transition-colors duration-300 shadow-xs">
              <img
                className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300"
                src={item.image}
                alt={item.speciality}
              />
            </div>

            <p className="text-gray-900 font-bold text-xs sm:text-sm group-hover:text-blue-700 transition-colors line-clamp-1">
              {item.speciality}
            </p>

            <span className="mt-1.5 text-[10px] text-gray-400 font-medium group-hover:text-blue-600 transition-colors">
              Specialist Consult →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SpecialityMenu;
