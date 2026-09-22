import React from 'react';
import { Doctor } from '../../types';
import { StarRating } from '../common/StarRating';
import { Badge } from '../common/Badge';
import { Calendar, Award, Building2 } from 'lucide-react';

interface DoctorCardProps {
  doctor: Doctor;
  onBookAppointment: (doctor: Doctor) => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onBookAppointment }) => {
  const availableSlotsCount = doctor.availableSlots?.filter((s) => !s.isBooked).length || 0;

  return (
    <div className="bg-white rounded-2xl p-5 border border-surface-100 shadow-card hover:shadow-soft transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Top Info */}
        <div className="flex items-start gap-4">
          <img
            src={
              doctor.userId?.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                doctor.userId?.name || 'Dr'
              )}&background=2563EB&color=fff`
            }
            alt={doctor.userId?.name}
            className="w-16 h-16 rounded-2xl object-cover border border-surface-200 shadow-xs shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-surface-900 truncate">
                {doctor.userId?.name}
              </h4>
              <Badge variant="primary">{doctor.specialization}</Badge>
            </div>
            <p className="text-xs text-surface-500 truncate mt-0.5">{doctor.qualifications}</p>
            <div className="flex items-center gap-2 mt-2">
              <StarRating
                rating={doctor.averageRating}
                showNumber
                totalReviews={doctor.reviewCount}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Hospital & Experience meta */}
        <div className="mt-4 pt-3 border-t border-surface-50 space-y-2 text-xs text-surface-600">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-surface-400 shrink-0" />
            <span className="truncate">{doctor.hospitalId?.name || 'LifeLink Network Hospital'}</span>
          </div>
          <div className="flex items-center justify-between text-surface-500">
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              <span>{doctor.experienceYears} Years Exp.</span>
            </div>
            <span className="font-bold text-surface-900 text-sm">
              ₹{doctor.consultationFee}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-surface-50 flex items-center justify-between">
        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {availableSlotsCount > 0 ? `${availableSlotsCount} slots today` : 'Check slots'}
        </span>
        <button
          onClick={() => onBookAppointment(doctor)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Book Slot</span>
        </button>
      </div>
    </div>
  );
};
