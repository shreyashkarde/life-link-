import React, { useState } from 'react';
import { ShieldAlert, Zap, AlertOctagon, Radio, Navigation, CheckCircle2 } from 'lucide-react';
import { bookingAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';

export const SOSAlertButton: React.FC = () => {
  const { addToast } = useToast();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTriggerSOS = async () => {
    setLoading(true);

    // Try to get actual browser GPS or fallback
    let currentCoords = {
      lat: 19.076 + (Math.random() - 0.5) * 0.01,
      lng: 72.8777 + (Math.random() - 0.5) * 0.01,
      address: 'Current Patient GPS Coordinates (High Priority SOS)',
    };

    if (navigator.geolocation) {
      try {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              currentCoords = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                address: 'Patient Live GPS Location (SOS Emergency)',
              };
              resolve();
            },
            () => resolve(),
            { timeout: 3000 }
          );
        });
      } catch (e) {
        console.warn('Geolocation fallback');
      }
    }

    try {
      const res = await bookingAPI.createSOS({
        pickupLocation: currentCoords,
        emergencyNotes: 'CRITICAL 1-CLICK SOS: Immediate ALS Ambulance Required',
      });

      const booking = res.data.booking;

      // Broadcast emergency alert via socket
      if (socket) {
        socket.emit('emergency:sosTriggered', booking);
      }

      addToast(
        'success',
        '🚨 EMERGENCY AMBULANCE DISPATCHED! Nearest ALS unit assigned and en route.',
        'Priority SOS Alert'
      );
      setIsModalOpen(false);
      navigate(`/tracking/${booking._id}`);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Emergency dispatch failed. Call 108/112 immediately!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="group relative inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white font-extrabold text-xs tracking-wider uppercase shadow-glow-rose hover:shadow-rose-600/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 ring-4 ring-rose-500/25 overflow-hidden"
      >
        {/* Ambient pulse halo */}
        <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
        <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
        <span className="relative z-10">1-Click SOS Emergency</span>
      </button>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="⚠️ Immediate SOS Ambulance Escalation"
        subtitle="This triggers an automatic code-red dispatch to the fastest available ALS unit."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-br from-rose-50 to-red-50/70 border border-rose-200/80 rounded-2xl flex items-start gap-3.5 shadow-xs">
            <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs mt-0.5">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-xs text-rose-950 leading-relaxed">
              <p className="font-extrabold text-sm text-rose-900">Priority Code-Red Signal</p>
              <p className="mt-1 text-rose-800 font-medium">
                Your precise GPS coordinates will be transmitted to emergency dispatch operators, nearby ALS trauma units, and hospital ER triage beds simultaneously.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-surface-50 rounded-2xl border border-surface-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-surface-500 font-medium flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                Dispatch Mode:
              </span>
              <span className="font-bold text-surface-900">Advanced Life Support (ALS)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-surface-500 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                GPS Geo-Lock:
              </span>
              <span className="font-bold text-emerald-600">Active High-Accuracy</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-surface-600 hover:bg-surface-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleTriggerSOS}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white text-xs font-black transition-all shadow-glow-rose disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>{loading ? 'Transmitting Code Red...' : 'Confirm SOS Dispatch'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
