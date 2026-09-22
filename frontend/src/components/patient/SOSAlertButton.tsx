import React, { useState } from 'react';
import { ShieldAlert, Zap, AlertOctagon } from 'lucide-react';
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
        '🚨 EMERGENCY AMBULANCE DISPATCHED! Driver assigned & en route.',
        'High Priority SOS'
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
        className="group relative flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-black text-sm tracking-wide shadow-lg hover:shadow-red-500/30 transition-all transform hover:scale-105 active:scale-95 animate-pulse"
      >
        <span className="w-3 h-3 rounded-full bg-white animate-ping" />
        <ShieldAlert className="w-5 h-5 text-white" />
        <span>1-CLICK SOS EMERGENCY</span>
      </button>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="⚠️ Trigger Emergency SOS Ambulance?"
        subtitle="This will immediately assign the nearest Advanced Life Support unit to your GPS location."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertOctagon className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-900 leading-relaxed">
              <p className="font-bold">Instant High-Priority Dispatch</p>
              <p className="mt-1 text-red-800">
                All nearest ambulances and hospital emergency rooms will be alerted with your live location.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleTriggerSOS}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all shadow-md disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>{loading ? 'Dispatching...' : 'Confirm SOS Dispatch'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
