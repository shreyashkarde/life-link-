import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { StarRating } from '../common/StarRating';
import { ratingAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { Heart } from 'lucide-react';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'DOCTOR' | 'DRIVER';
  targetId: string;
  targetName: string;
  bookingId?: string;
  appointmentId?: string;
  onSuccess?: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  bookingId,
  appointmentId,
  onSuccess,
}) => {
  const { addToast } = useToast();
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await ratingAPI.create({
        targetType,
        targetId,
        bookingId,
        appointmentId,
        rating,
        comment,
      });

      addToast('success', 'Thank you for your rating and feedback!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rate ${targetType === 'DOCTOR' ? 'Doctor' : 'Driver'}: ${targetName}`}
      subtitle="Help us maintain high quality emergency & healthcare standards"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Interactive Star Selection */}
        <div className="flex flex-col items-center justify-center p-4 bg-surface-50 rounded-2xl border border-surface-100">
          <p className="text-xs text-surface-500 font-semibold mb-2">Tap stars to rate</p>
          <StarRating
            rating={rating}
            interactive={true}
            onRatingChange={(r) => setRating(r)}
            size="lg"
          />
          <span className="text-sm font-bold text-blue-600 mt-2">
            {rating === 5 && '🌟 Excellent Service!'}
            {rating === 4 && '👍 Very Good'}
            {rating === 3 && '👌 Good / Satisfactory'}
            {rating === 2 && '⚠️ Needs Improvement'}
            {rating === 1 && '❌ Poor Experience'}
          </span>
        </div>

        {/* Written Review */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 mb-1">
            Write your feedback or review
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience (e.g. response time, medical care, professionalism)..."
            className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
          />
        </div>

        {/* Submit */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-surface-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
          >
            Skip
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-soft disabled:opacity-50"
          >
            <Heart className="w-3.5 h-3.5" />
            <span>{loading ? 'Submitting...' : 'Submit Review'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
