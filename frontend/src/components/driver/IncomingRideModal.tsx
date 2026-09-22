import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { AmbulanceBooking } from '../../types';
import { MapPin, Navigation, ShieldAlert, Check, X, Clock } from 'lucide-react';
import { Badge } from '../common/Badge';

interface IncomingRideModalProps {
  booking: AmbulanceBooking | null;
  isOpen: boolean;
  onAccept: (bookingId: string) => void;
  onReject: (bookingId: string) => void;
}

export const IncomingRideModal: React.FC<IncomingRideModalProps> = ({
  booking,
  isOpen,
  onAccept,
  onReject,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(30);

  useEffect(() => {
    if (!isOpen || !booking) return;

    setTimeLeft(30);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReject(booking._id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, booking, onReject]);

  if (!booking) return null;

  const isSOS = booking.isSOS || booking.tripType === 'SOS_EMERGENCY';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onReject(booking._id)}
      title={isSOS ? '🚨 CRITICAL EMERGENCY SOS DISPATCH' : '🚑 New Ambulance Booking Request'}
      subtitle={`Auto-rejecting in ${timeLeft}s if not accepted`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Countdown & Fare Badge */}
        <div className="flex items-center justify-between p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
            <Clock className="w-4 h-4 text-blue-600 animate-spin" />
            <span>Accept within {timeLeft}s</span>
          </div>
          <span className="text-base font-black text-blue-700">₹{booking.fare}</span>
        </div>

        {/* Priority Banner if SOS */}
        {isSOS && (
          <div className="p-3 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
            <ShieldAlert className="w-4 h-4" />
            <span>High-Priority Life Support Emergency Dispatch</span>
          </div>
        )}

        {/* Route Details */}
        <div className="p-4 bg-surface-50 rounded-2xl border border-surface-100 space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">Pickup Point</p>
              <p className="text-xs font-bold text-surface-900 mt-0.5">
                {booking.pickupLocation?.address || 'Patient Pickup Coordinates'}
              </p>
            </div>
          </div>

          <div className="h-4 border-l-2 border-dashed border-surface-300 ml-2" />

          <div className="flex items-start gap-3">
            <Navigation className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">Destination</p>
              <p className="text-xs font-bold text-surface-900 mt-0.5">
                {booking.destinationLocation?.address || 'LifeLink Trauma Hospital'}
              </p>
            </div>
          </div>
        </div>

        {/* Patient Condition & Vehicle Meta */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
            <span className="text-[11px] text-surface-400 block">Condition:</span>
            <span className="font-bold text-surface-800 truncate block">
              {booking.patientCondition || 'Stable'}
            </span>
          </div>
          <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
            <span className="text-[11px] text-surface-400 block">Vehicle Required:</span>
            <Badge variant="primary">{booking.ambulanceType}</Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => onReject(booking._id)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-surface-200 text-surface-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-xs font-bold transition-all"
          >
            <X className="w-4 h-4" />
            <span>Decline</span>
          </button>
          <button
            type="button"
            onClick={() => onAccept(booking._id)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-soft"
          >
            <Check className="w-4 h-4" />
            <span>Accept Ride</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
