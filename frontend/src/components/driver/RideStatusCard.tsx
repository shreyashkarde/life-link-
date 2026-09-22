import React from 'react';
import { AmbulanceBooking } from '../../types';
import { Badge } from '../common/Badge';
import { Phone, CheckCircle2, ChevronRight, User, Navigation } from 'lucide-react';

interface RideStatusCardProps {
  booking: AmbulanceBooking;
  onUpdateStatus: (bookingId: string, nextStatus: string) => void;
}

export const RideStatusCard: React.FC<RideStatusCardProps> = ({
  booking,
  onUpdateStatus,
}) => {
  const getNextAction = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return { label: 'Start En Route to Patient', next: 'ONGOING' };
      case 'ONGOING':
        return { label: 'Mark Arrived at Patient', next: 'ARRIVED_AT_PATIENT' };
      case 'ARRIVED_AT_PATIENT':
        return { label: 'In Transit to Hospital', next: 'ARRIVED_AT_HOSPITAL' };
      case 'ARRIVED_AT_HOSPITAL':
        return { label: 'Complete Ride & Handover', next: 'COMPLETED' };
      default:
        return null;
    }
  };

  const action = getNextAction(booking.status);

  return (
    <div className="bg-white rounded-2xl p-5 border border-surface-100 shadow-card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-surface-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-surface-900">Ride #{booking._id.slice(-6)}</span>
            <Badge variant={booking.status === 'COMPLETED' ? 'success' : 'primary'} dot>
              {booking.status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-[11px] text-surface-400 mt-0.5">
            {new Date(booking.createdAt).toLocaleTimeString()}
          </p>
        </div>
        <span className="text-base font-black text-blue-600">₹{booking.fare}</span>
      </div>

      {/* Patient info & Call */}
      <div className="flex items-center justify-between p-3 bg-surface-50 rounded-xl border border-surface-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-surface-900">{booking.patientId?.name || 'Emergency Patient'}</p>
            <p className="text-[11px] text-surface-500">{booking.patientId?.phone || '+91 98200 55555'}</p>
          </div>
        </div>

        <a
          href={`tel:${booking.patientId?.phone || '108'}`}
          className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 text-xs font-bold"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Call</span>
        </a>
      </div>

      {/* Route */}
      <div className="space-y-1.5 text-xs text-surface-600">
        <div className="flex items-start gap-2">
          <span className="text-rose-500 font-bold">●</span>
          <span className="truncate">{booking.pickupLocation?.address}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-emerald-500 font-bold">■</span>
          <span className="truncate">{booking.destinationLocation?.address}</span>
        </div>
      </div>

      {/* Advance Ride Button */}
      {action && (
        <button
          onClick={() => onUpdateStatus(booking._id, action.next)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-soft"
        >
          <span>{action.label}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {booking.status === 'COMPLETED' && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-center gap-2 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Trip Completed & Handed Over</span>
        </div>
      )}
    </div>
  );
};
