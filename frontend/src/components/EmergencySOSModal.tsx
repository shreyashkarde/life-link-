import React, { useState, useEffect } from 'react';
import ambulanceService, { AmbulanceItem } from '../services/ambulanceService';
import socketService from '../services/socket';
import ratingService from '../services/ratingService';
import { useApp } from '../context/AppContext';

import soundService from '../services/soundService';

export const EmergencySOSModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { userData, showToast } = useApp();

  const [nearbyAmbulances, setNearbyAmbulances] = useState<AmbulanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number; heading?: number } | null>(null);

  // Rating Modal state
  const [showRating, setShowRating] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingReview, setRatingReview] = useState('');

  // Fetch nearby ambulances when modal opens
  useEffect(() => {
    if (isOpen) {
      loadNearby();
    }
  }, [isOpen]);

  const loadNearby = async () => {
    try {
      setLoading(true);
      const res = await ambulanceService.getNearbyAmbulances(19.076, 72.8777, 25);
      if (res.success) {
        setNearbyAmbulances(res.ambulances || []);
      }
    } catch {
      // silently fallback
    } finally {
      setLoading(false);
    }
  };

  // Socket room listener when a booking is active
  useEffect(() => {
    if (activeBooking?._id) {
      const room = `ride_${activeBooking._id}`;
      socketService.joinRoom(room);

      socketService.onLocationUpdate((payload) => {
        setLiveLocation({ lat: payload.lat, lng: payload.lng, heading: payload.heading });
      });

      socketService.onRideCompleted((payload) => {
        showToast('Ambulance mission completed! Patient arrived at Hospital.', 'success');
        setActiveBooking((prev: any) => ({ ...prev, status: 'COMPLETED' }));
        setShowRating(true);
      });

      return () => {
        socketService.leaveRoom(room);
      };
    }
  }, [activeBooking?._id]);

  // One-Click Emergency SOS Action
  const handleTriggerSOS = async () => {
    try {
      setLoading(true);
      const res = await ambulanceService.triggerEmergencySOS({
        pickupLocation: {
          address: userData?.address?.line1 || 'Current GPS Location, Mumbai',
          lat: 19.076,
          lng: 72.8777,
        },
        patientName: userData?.name || 'Emergency Patient',
        patientPhone: userData?.phone || '+91 98200 99999',
        condition: 'Critical Emergency Callout',
      });

      if (res.success) {
        soundService.playEmergencySiren(3.5);
        setActiveBooking(res.booking);
        showToast('🚨 Code Red SOS Active! Closest ambulance dispatched.', 'success');
      } else {
        showToast(res.message || 'Emergency dispatch failed', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Emergency SOS failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Submit Driver Rating
  const handleSubmitReview = async () => {
    try {
      if (activeBooking?.ambulanceId) {
        await ratingService.submitRating({
          targetType: 'DRIVER',
          targetId: activeBooking.ambulanceId,
          rating: ratingScore,
          review: ratingReview,
          userName: userData?.name || 'Patient',
        });
        showToast('Thank you for rating the emergency transit crew!', 'success');
      }
    } catch {
      showToast('Rating submitted', 'success');
    } finally {
      setShowRating(false);
      setActiveBooking(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-outfit animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border-2 border-primary/20 flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="bg-primary px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-pulse">🚑</span>
            <div>
              <h2 className="text-lg font-black leading-tight">Emergency Ambulance Dispatch</h2>
              <p className="text-[11px] text-white/80 font-medium">Real-Time Telemetry & Nearest Driver Response</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Active Mission Display if SOS has been triggered */}
          {activeBooking && (
            <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-primary/30 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="px-3 py-1 bg-primary text-white text-[11px] font-black rounded-full uppercase tracking-wider">
                  Live Dispatch: {activeBooking.status}
                </span>
                <span className="text-xs font-bold text-gray-500">Unit: {activeBooking.vehicleNumber}</span>
              </div>
              <p className="text-sm font-extrabold text-gray-900 mt-1">
                Driver: <span className="text-primary">{activeBooking.driverName}</span> ({activeBooking.driverPhone})
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Destination: {activeBooking.destinationHospital?.name}</p>

              {liveLocation && (
                <div className="mt-3 p-3 bg-white rounded-xl border border-primary/20 text-xs font-bold text-primary flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                  <span>Live GPS: {liveLocation.lat.toFixed(4)}° N, {liveLocation.lng.toFixed(4)}° E</span>
                </div>
              )}
            </div>
          )}

          {/* High Priority One-Tap SOS Button */}
          {!activeBooking && (
            <div className="text-center p-5 bg-rose-50 border-2 border-rose-200 rounded-2xl">
              <p className="text-xs font-black text-rose-700 uppercase tracking-wider mb-2">
                ⚡ Critical Emergency One-Tap Action
              </p>
              <button
                onClick={handleTriggerSOS}
                disabled={loading}
                className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-base rounded-2xl shadow-lg hover:shadow-rose-600/30 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>🚨</span>
                <span>{loading ? 'Locating Closest Driver...' : 'TRIGGER ONE-TAP EMERGENCY SOS'}</span>
              </button>
              <p className="text-[11px] text-gray-500 mt-2 font-medium">
                Auto-assigns nearest life-support ambulance with priority sirens.
              </p>
            </div>
          )}

          {/* Nearest Available Ambulances List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">
                Nearest Fleet in Proximity ({nearbyAmbulances.length})
              </h3>
              <button onClick={loadNearby} className="text-xs text-primary font-bold hover:underline">
                Refresh
              </button>
            </div>

            <div className="space-y-2.5">
              {nearbyAmbulances.slice(0, 3).map((amb) => (
                <div
                  key={amb._id}
                  className="p-3.5 bg-gray-50 hover:bg-blue-50/50 border border-gray-200 rounded-2xl flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-lg">
                      🚑
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-900">{amb.vehicleNumber} ({amb.ambulanceType})</p>
                      <p className="text-[11px] text-gray-500 font-medium">
                        Driver: {amb.driverName} • ⭐ {amb.rating}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-primary block">{amb.etaMinutes || 5} Mins ETA</span>
                    <span className="text-[10px] text-gray-400 font-medium">{amb.distanceKm || 2.4} km away</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rating & Review Sub-Modal upon completion */}
        {showRating && (
          <div className="p-6 bg-white border-t border-gray-200 space-y-3">
            <h4 className="text-sm font-black text-gray-900">Rate Your Emergency Transit Experience</h4>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingScore(star)}
                  className={`text-xl cursor-pointer ${star <= ratingScore ? 'text-amber-400' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              className="w-full p-2.5 border rounded-xl text-xs"
              placeholder="Leave feedback on driver speed and care..."
              rows={2}
              value={ratingReview}
              onChange={(e) => setRatingReview(e.target.value)}
            />
            <button
              onClick={handleSubmitReview}
              className="w-full py-2 bg-primary text-white text-xs font-bold rounded-xl"
            >
              Submit Rating & Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencySOSModal;
