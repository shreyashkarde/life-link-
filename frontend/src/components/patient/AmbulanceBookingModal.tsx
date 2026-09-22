import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { bookingAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { MapPin, Navigation, Zap, AlertTriangle } from 'lucide-react';

interface AmbulanceBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess?: (booking: any) => void;
}

export const AmbulanceBookingModal: React.FC<AmbulanceBookingModalProps> = ({
  isOpen,
  onClose,
  onBookingSuccess,
}) => {
  const { addToast } = useToast();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [pickupAddress, setPickupAddress] = useState('Bandra Kurla Complex, Mumbai');
  const [destinationAddress, setDestinationAddress] = useState('LifeLink Central Trauma Hospital');
  const [ambulanceType, setAmbulanceType] = useState<'BASIC' | 'ADVANCED_ALS' | 'OXYGEN_BLS'>('ADVANCED_ALS');
  const [patientCondition, setPatientCondition] = useState('Stable / Conscious');
  const [loading, setLoading] = useState(false);

  const ambulanceOptions = [
    {
      type: 'ADVANCED_ALS',
      name: 'Advanced Life Support (ALS)',
      desc: 'Ventilator, Defibrillator, Paramedic on board',
      fare: '₹599 base + ₹30/km',
      icon: '🚑',
      badge: 'Recommended for Critical Cases',
    },
    {
      type: 'OXYGEN_BLS',
      name: 'Oxygen Basic Life Support',
      desc: 'Dual Oxygen Cylinder, Vital Monitor, Stretcher',
      fare: '₹449 base + ₹24/km',
      icon: '🫁',
      badge: 'Respiratory & Elderly Care',
    },
    {
      type: 'BASIC',
      name: 'Basic Patient Transport',
      desc: 'Standard Stretcher, First Aid, Escort',
      fare: '₹349 base + ₹20/km',
      icon: '🚐',
      badge: 'Non-Emergency Transfer',
    },
  ];

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Mock geocoded coordinates around Mumbai
      const pickupCoords = {
        lat: 19.0685 + (Math.random() - 0.5) * 0.02,
        lng: 72.8655 + (Math.random() - 0.5) * 0.02,
        address: pickupAddress,
      };

      const destCoords = {
        lat: 19.0668,
        lng: 72.8682,
        address: destinationAddress,
      };

      const res = await bookingAPI.create({
        pickupLocation: pickupCoords,
        destinationLocation: destCoords,
        ambulanceType,
        patientCondition,
      });

      const booking = res.data.booking;

      // Broadcast to online drivers via socket
      if (socket) {
        socket.emit('booking:newRequest', booking);
      }

      addToast('success', 'Ambulance requested! Locating nearest driver...');
      if (onBookingSuccess) onBookingSuccess(booking);
      onClose();

      // Navigate to live ride tracking page
      navigate(`/tracking/${booking._id}`);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to dispatch ambulance request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Book Emergency / Standard Ambulance"
      subtitle="Uber-like live dispatch with GPS tracking"
      maxWidth="xl"
    >
      <form onSubmit={handleBook} className="space-y-4">
        {/* Pickup & Destination */}
        <div className="space-y-2.5">
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              Pickup Location
            </label>
            <div className="relative">
              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Enter pickup address or landmark"
                className="w-full pl-9 pr-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                required
              />
              <MapPin className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-emerald-600" />
              Hospital Destination
            </label>
            <div className="relative">
              <input
                type="text"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="Nearest Emergency Hospital"
                className="w-full pl-9 pr-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                required
              />
              <Navigation className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
            </div>
          </div>
        </div>

        {/* Vehicle Selection Cards */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 mb-2">
            Select Ambulance Category
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {ambulanceOptions.map((opt) => (
              <div
                key={opt.type}
                onClick={() => setAmbulanceType(opt.type as any)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  ambulanceType === opt.type
                    ? 'bg-blue-50/70 border-blue-600 shadow-soft ring-1 ring-blue-600'
                    : 'bg-white border-surface-200 hover:border-blue-300 hover:bg-surface-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {opt.badge}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-surface-900 mt-2">{opt.name}</h4>
                <p className="text-[11px] text-surface-500 mt-0.5 leading-snug">{opt.desc}</p>
                <p className="text-xs font-bold text-blue-700 mt-2">{opt.fare}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Patient Condition */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Patient Current Condition
          </label>
          <select
            value={patientCondition}
            onChange={(e) => setPatientCondition(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          >
            <option value="Stable / Conscious">Stable / Conscious</option>
            <option value="Severe Chest Pain / Heart Issue">Severe Chest Pain / Heart Issue</option>
            <option value="Breathing Difficulty / Low SpO2">Breathing Difficulty / Low SpO2</option>
            <option value="Accident / Trauma / Fracture">Accident / Trauma / Fracture</option>
            <option value="Unconscious / Critical">Unconscious / Critical Emergency</option>
          </select>
        </div>

        {/* Submit */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-surface-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-soft disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            <span>{loading ? 'Finding Driver...' : 'Request Ambulance Now'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
