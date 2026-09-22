import React, { useState } from 'react';
import { Doctor } from '../../types';
import { Modal } from '../common/Modal';
import { appointmentAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface BookAppointmentModalProps {
  doctor: Doctor | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({
  doctor,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addToast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [symptoms, setSymptoms] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!doctor) return null;

  // Filter available slots for the selected date
  const slotsForDate =
    doctor.availableSlots?.filter(
      (s) => s.date === selectedDate && !s.isBooked
    ) || [];

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      addToast('warning', 'Please select an available consultation time slot');
      return;
    }

    setLoading(true);
    try {
      await appointmentAPI.book({
        doctorId: doctor._id,
        slotDate: selectedDate,
        slotTime: selectedSlot,
        symptoms,
      });

      addToast('success', `Appointment confirmed with ${doctor.userId?.name} for ${selectedDate} at ${selectedSlot}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Book Consultation: ${doctor.userId?.name}`}
      subtitle={`${doctor.specialization} • ₹${doctor.consultationFee} Consultation Fee`}
      maxWidth="lg"
    >
      <form onSubmit={handleBook} className="space-y-4">
        {/* Date Selection */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Select Appointment Date
          </label>
          <input
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedSlot('');
            }}
            className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            required
          />
        </div>

        {/* Time Slots Grid */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Select Time Slot
          </label>
          {slotsForDate.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {slotsForDate.map((slot, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedSlot(slot.startTime)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    selectedSlot === slot.startTime
                      ? 'bg-blue-600 text-white border-blue-600 shadow-soft'
                      : 'bg-white text-surface-700 border-surface-200 hover:border-blue-400 hover:bg-blue-50/50'
                  }`}
                >
                  {slot.startTime} - {slot.endTime}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>No open slots available on this date. Please pick another date.</span>
            </div>
          )}
        </div>

        {/* Symptoms / Medical Notes */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 mb-1.5">
            Symptoms / Reason for Visit (Optional)
          </label>
          <textarea
            rows={3}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="e.g. Mild fever since 2 days, persistent cough..."
            className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
          />
        </div>

        {/* Action Buttons */}
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
            disabled={loading || !selectedSlot}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-soft"
          >
            {loading ? 'Confirming...' : `Pay & Confirm (₹${doctor.consultationFee})`}
          </button>
        </div>
      </form>
    </Modal>
  );
};
