import React, { useState, useEffect, useRef } from 'react';
import socketService from '../../services/socket';
import soundService from '../../services/soundService';
import apiClient from '../../services/apiClient';

export interface AmbulanceRequestData {
  bookingId: string;
  patientId: string;
  patientName?: string;
  patientPhone?: string;
  pickupLocation: {
    address: string;
    lat: number;
    lng: number;
  };
  destinationHospital?: {
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
  } | string;
  hospitalId?: string;
  hospitalName?: string;
  emergencyType?: string;
  severity?: string;
  fare?: number;
  distanceKm?: number;
  etaMinutes?: number;
  createdAt?: string;
}

interface IncomingRequestCardProps {
  request?: AmbulanceRequestData | null;
  onAccept?: (bookingId: string) => void;
  onReject?: (bookingId: string) => void;
  autoListenSocket?: boolean;
  className?: string;
}

export const IncomingRequestCard: React.FC<IncomingRequestCardProps> = ({
  request: externalRequest,
  onAccept,
  onReject,
  autoListenSocket = true,
  className = '',
}) => {
  const [activeRequest, setActiveRequest] = useState<AmbulanceRequestData | null>(externalRequest || null);
  const [countdown, setCountdown] = useState<number>(30); // 30s countdown like Uber
  const timerRef = useRef<any>(null);

  // Sync external request prop
  useEffect(() => {
    if (externalRequest) {
      setActiveRequest(externalRequest);
      setCountdown(30);
    }
  }, [externalRequest]);

  // Socket listener for ambulanceRequest
  useEffect(() => {
    if (!autoListenSocket) return;

    socketService.connect();
    const unsub = socketService.onAmbulanceRequest((data: any) => {
      if (!data) return;
      const formatted: AmbulanceRequestData = {
        bookingId: data.bookingId || data._id || 'SOS-' + Date.now(),
        patientId: data.patientId || 'user_1',
        patientName: data.patientName || 'Emergency Patient',
        patientPhone: data.patientPhone || '+91 98200 99999',
        pickupLocation: data.pickupLocation || { address: 'GPS Emergency Pin', lat: 19.076, lng: 72.8777 },
        destinationHospital: data.destinationHospital || data.hospitalName || 'Lilavati Hospital & Research Centre',
        hospitalId: data.hospitalId || 'hosp_lilavati',
        hospitalName: data.hospitalName || 'Lilavati Hospital & Research Centre',
        emergencyType: data.emergencyType || data.patientCondition || 'CRITICAL_CODE_RED',
        severity: data.severity || data.emergencySeverity || 'CRITICAL_CODE_RED',
        fare: data.fare || 150,
        distanceKm: data.distanceKm || 1.4,
        etaMinutes: data.etaMinutes || 3,
        createdAt: data.createdAt || new Date().toISOString(),
      };

      setActiveRequest(formatted);
      setCountdown(30);
      try {
        soundService.playDispatchAlert();
      } catch {
        // Non-blocking
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [autoListenSocket]);

  // Countdown timer
  useEffect(() => {
    if (!activeRequest) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeRequest]);

  const handleAccept = async () => {
    if (!activeRequest) return;
    const bId = activeRequest.bookingId;

    try {
      // 1. Emit socket accept
      socketService.acceptRide({
        bookingId: bId,
        driverId: 'driver_108',
        driverName: 'Rajesh Kumar',
        vehicleNumber: 'MH-01-EQ-1108',
        patientId: activeRequest.patientId,
        hospitalId: activeRequest.hospitalId,
      });

      // 2. Call API accept
      await apiClient.post('/api/bookings/accept', {
        bookingId: bId,
        driverId: 'driver_108',
        driverName: 'Rajesh Kumar',
        vehicleNumber: 'MH-01-EQ-1108',
      });
    } catch {
      // Non-blocking fallback
    }

    if (onAccept) {
      onAccept(bId);
    }
    setActiveRequest(null);
  };

  const handleReject = async () => {
    if (!activeRequest) return;
    const bId = activeRequest.bookingId;

    try {
      socketService.rejectRide({ bookingId: bId, reason: 'Driver unavailable' });
      await apiClient.post('/api/bookings/reject', { bookingId: bId, reason: 'Driver unavailable' });
    } catch {
      // Non-blocking fallback
    }

    if (onReject) {
      onReject(bId);
    }
    setActiveRequest(null);
  };

  if (!activeRequest) return null;

  const destName =
    typeof activeRequest.destinationHospital === 'string'
      ? activeRequest.destinationHospital
      : activeRequest.destinationHospital?.name || activeRequest.hospitalName || 'Lilavati Hospital & Research Centre';

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] max-w-md w-[calc(100vw-2rem)] sm:w-[420px] bg-white/95 backdrop-blur-md rounded-3xl border-2 border-rose-500 shadow-2xl p-5 sm:p-6 text-slate-900 font-sans animate-in slide-in-from-top-4 fade-in duration-300 select-none ${className}`}
    >
      {/* Top Countdown Bar */}
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-4">
        <div
          className="bg-rose-600 h-full transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${(countdown / 30) * 100}%` }}
        />
      </div>

      {/* Header with Siren and Severity */}
      <div className="flex items-center justify-between gap-3 border-b border-rose-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center text-xl shadow-md animate-pulse">
            🚨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-md">
                {activeRequest.severity || 'CODE-RED EMERGENCY'}
              </span>
              <span className="text-xs font-mono font-bold text-rose-600">{countdown}s</span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
              Incoming Dispatch #{activeRequest.bookingId.slice(-6)}
            </h3>
          </div>
        </div>

        <div className="text-right">
          <p className="text-base font-black text-emerald-600">₹{activeRequest.fare || 150}</p>
          <p className="text-[10px] font-bold text-slate-400">Estimated Fare</p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="py-3.5 space-y-2.5 text-xs">
        {/* Patient Info */}
        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Patient</p>
            <p className="font-extrabold text-slate-900">{activeRequest.patientName || 'Emergency Patient'}</p>
          </div>
          <a
            href={`tel:${activeRequest.patientPhone || '+919820099999'}`}
            className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-[11px] flex items-center gap-1 border border-blue-200"
          >
            <span>📞</span>
            <span>Call</span>
          </a>
        </div>

        {/* Pickup & Destination */}
        <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <div className="flex items-start gap-2">
            <span className="text-emerald-600 font-black text-sm">📍</span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Pickup Location</p>
              <p className="font-bold text-slate-800 text-[11px] truncate">
                {activeRequest.pickupLocation?.address || 'Current GPS Location'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 border-t border-slate-200/80 pt-2">
            <span className="text-blue-600 font-black text-sm">🏥</span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Destination Hospital</p>
              <p className="font-bold text-slate-800 text-[11px] truncate">{destName}</p>
            </div>
          </div>
        </div>

        {/* Proximity & Condition */}
        <div className="flex items-center justify-between text-[11px] text-slate-600 bg-rose-50/70 p-2 rounded-xl border border-rose-200">
          <span>
            Proximity: <strong className="text-slate-900">{activeRequest.distanceKm || 1.4} km</strong> (~
            {activeRequest.etaMinutes || 3} mins ETA)
          </span>
          <span className="font-bold text-rose-700 truncate max-w-[150px]">
            {activeRequest.emergencyType || 'Urgent SOS'}
          </span>
        </div>
      </div>

      {/* Action Buttons: Accept / Reject */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={handleReject}
          className="py-3 px-4 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-extrabold rounded-2xl transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5"
        >
          <span>✕</span>
          <span>Reject</span>
        </button>

        <button
          type="button"
          onClick={handleAccept}
          className="py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5"
        >
          <span>✓</span>
          <span>Accept Ride</span>
        </button>
      </div>
    </div>
  );
};

export default IncomingRequestCard;
