import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { DoctorItem } from '../assets/assets';

interface RelatedDoctorsProps {
  docId: string;
  speciality: string;
}

export const RelatedDoctors: React.FC<RelatedDoctorsProps> = ({ docId, speciality }) => {
  const { doctors } = useApp();
  const navigate = useNavigate();
  const [relDoc, setRelDoc] = useState<DoctorItem[]>([]);

  useEffect(() => {
    if (doctors.length > 0 && speciality) {
      const doctorsData = doctors.filter(
        (doc) => doc.speciality === speciality && doc._id !== docId
      );
      setRelDoc(doctorsData);
    }
  }, [doctors, speciality, docId]);

  if (relDoc.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-4 my-16 text-gray-900 md:mx-10">
      <h1 className="text-3xl font-medium">Related Doctors</h1>
      <p className="sm:w-1/3 text-center text-sm text-gray-500">
        Simply browse through other doctors specialized in {speciality}.
      </p>

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pt-5 gap-y-6 px-3 sm:px-0">
        {relDoc.slice(0, 5).map((item, index) => (
          <div
            key={index}
            onClick={() => {
              navigate(`/appointment/${item._id}`);
              window.scrollTo(0, 0);
            }}
            className="border border-blue-200 rounded-xl overflow-hidden cursor-pointer hover:translate-y-[-10px] transition-all duration-300 shadow-sm hover:shadow-md bg-white"
          >
            <div className="bg-blue-50 flex items-center justify-center h-48 overflow-hidden">
              <img
                className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
                src={item.image}
                alt={item.name}
              />
            </div>
            <div className="p-4">
              <div
                className={`flex items-center gap-2 text-sm text-center ${
                  item.available !== false ? 'text-green-500' : 'text-gray-500'
                }`}
              >
                <p
                  className={`w-2 h-2 ${
                    item.available !== false ? 'bg-green-500' : 'bg-gray-500'
                  } rounded-full`}
                ></p>
                <p className="font-medium text-xs">
                  {item.available !== false ? 'Available' : 'Not Available'}
                </p>
              </div>
              <p className="text-gray-900 text-lg font-medium mt-1">{item.name}</p>
              <p className="text-gray-600 text-sm">{item.speciality}</p>
              <p className="text-primary font-semibold text-sm mt-1">${item.fees} Fee</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelatedDoctors;
