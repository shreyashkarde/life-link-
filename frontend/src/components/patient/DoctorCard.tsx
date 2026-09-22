import React from 'react';
import { Doctor } from '../../types';
import { StarRating } from '../common/StarRating';
import { Badge } from '../common/Badge';
import { Calendar, Award, Building2, ChevronRight } from 'lucide-react';

interface DoctorCardProps {
  doctor: Doctor;
  onBookAppointment: (doctor: Doctor) => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onBookAppointment }) => {
  const availableSlotsCount = doctor.availableSlots?.filter((s) => !s.isBooked).length || 0;

  return (
    <div className="glass-card rounded-3xl p-5 border border-surface-200/80 shadow-luxury glass-card-hover flex flex-col justify-between group">
      <div>
        {/* Top Info */}
        <div className="flex items-start gap-3.5">
          <img
            src={
              doctor.userId?.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                doctor.userId?.name || 'Dr'
              )}&background=2563EB&color=fff&bold=true`
            }
            alt={doctor.userId?.name}
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-600/20 shadow-xs shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5">
              <h4 className="text-xs font-black text-surface-900 truncate tracking-tight">
                {doctor.userId?.name}
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                {doctor.specialization}
              </span>
            </div>
            <p className="text-[11px] text-surface-500 truncate mt-0.5 font-medium">{doctor.qualifications}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
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
        <div className="mt-4 pt-3 border-t border-surface-100 space-y-2 text-xs text-surface-600">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-surface-400 shrink-0" />
            <span className="truncate font-medium text-[11px]">{doctor.hospitalId?.name || 'LifeLink Central Hospital'}</span>
          </div>
          <div className="flex items-center justify-between text-surface-500 text-[11px]">
            <div className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold">{doctor.experienceYears} Yrs Practice</span>
            </div>
            <span className="font-black text-surface-900 text-xs font-mono">
              ₹{doctor.consultationFee}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between">
        <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {availableSlotsCount > 0 ? `${availableSlotsCount} slots open` : 'Check slots'}
        </span>
        <button
          onClick={() => onBookAppointment(doctor)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs group-hover:shadow-glow-blue"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Book Slot</span>
        </button>
      </div>
    </div>
  );
};
