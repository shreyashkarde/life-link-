import React from 'react';
import soundService from '../../../services/soundService';

export interface DriverCardInfo {
  driverName?: string;
  driverPhone?: string;
  driverAvatar?: string;
  vehicleNumber?: string;
  ambulanceType?: string;
  rating?: number;
  status?: string;
  distanceKm?: number;
  etaMinutes?: number;
  destinationHospital?: string;
  pickupAddress?: string;
}

interface DriverCardProps {
  driverInfo?: DriverCardInfo | null;
  className?: string;
  onCallDriver?: () => void;
  onCancelRide?: () => void;
}

export const DriverCard: React.FC<DriverCardProps> = ({
  driverInfo,
  className = '',
  onCallDriver,
  onCancelRide,
}) => {
  if (!driverInfo) {
    return (
      <div className={`w-full bg-white rounded-3xl p-5 border border-slate-200 shadow-xl flex items-center gap-4 animate-pulse ${className}`}>
        <div className="w-14 h-14 bg-slate-200 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-3 bg-slate-200 rounded w-1/3" />
        </div>
      </div>
    );
  }

  const statusText = (() => {
    const s = (driverInfo.status || 'ACCEPTED').toUpperCase();
    if (s === 'EN_ROUTE' || s === 'EN_ROUTE_PICKUP') return '🚑 Ambulance on the way to you';
    if (s === 'PATIENT_PICKED' || s === 'PATIENT_ONBOARD') return '🧑‍🦽 Patient onboard • Driving to Trauma Center';
    if (s === 'COMPLETED') return '🏥 Arrived at Hospital Resuscitation Bay';
    return '✅ Driver Assigned & Confirmed';
  })();

  const phone = driverInfo.driverPhone || '+91 98201 10800';

  const handleSoundAlert = () => {
    try {
      soundService.playEmergencySiren(2);
    } catch {}
  };

  return (
    <div
      className={`w-full bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-2xl p-5 sm:p-6 text-slate-900 font-sans select-none transition-all ${className}`}
    >
      {/* Top Status & Live ETA */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3.5 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-black text-slate-800 tracking-tight">{statusText}</span>
        </div>

        <div className="text-right flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-xl">
          <span className="text-xs font-black">~{driverInfo.etaMinutes || 3} mins</span>
          <span className="text-[10px] text-blue-500">({driverInfo.distanceKm || 1.2} km)</span>
        </div>
      </div>

      {/* Driver & Vehicle Details Grid */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <img
              src={
                driverInfo.driverAvatar ||
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'
              }
              alt="Paramedic"
              className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-200 shadow-sm"
            />
            <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white text-[9px] font-black px-1 rounded-full border border-white">
              ALS
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900">
                {driverInfo.driverName || 'Rajesh Kumar'}
              </h3>
              <span className="text-xs text-amber-500 font-black">⭐ {driverInfo.rating || 4.9}</span>
            </div>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              Vehicle:{' '}
              <strong className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                {driverInfo.vehicleNumber || 'MH-01-EQ-1108'}
              </strong>{' '}
              • {driverInfo.ambulanceType || 'Advanced Life Support'}
            </p>
          </div>
        </div>

        {/* Action Buttons: Phone Call & Sound */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <a
            href={`tel:${phone}`}
            onClick={onCallDriver}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold rounded-2xl shadow-md shadow-emerald-600/20 text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>📞</span>
            <span>Call Driver</span>
          </a>

          <button
            type="button"
            onClick={handleSoundAlert}
            className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold transition-all cursor-pointer"
            title="Trigger Siren Alert"
          >
            🚨 Siren
          </button>

          {onCancelRide && (
            <button
              type="button"
              onClick={onCancelRide}
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Destination Hospital Banner */}
      {driverInfo.destinationHospital && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 truncate">
            <span>🏥 Destination:</span>
            <strong className="text-slate-800">{driverInfo.destinationHospital}</strong>
          </span>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 shrink-0">
            Trauma Bay Ready
          </span>
        </div>
      )}
    </div>
  );
};

export default DriverCard;
