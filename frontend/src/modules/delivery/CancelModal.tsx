import React from 'react';

export interface CancelModalProps {
  setCancelModal: (cancelModal: string | null) => void;
  cancelReason: string;
  setCancelReason: (cancelReason: string) => void;
  handleCancel: () => void;
  submitting: boolean;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  setCancelModal,
  cancelReason,
  setCancelReason,
  handleCancel,
  submitting,
}) => {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-xs" onClick={() => setCancelModal(null)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 animate-in fade-in duration-200 pointer-events-auto">
          <h3 className="text-lg font-semibold text-rose-600 mb-1 flex items-center gap-2">
            <span>✕</span> Cancel Delivery
          </h3>
          <p className="text-xs text-slate-500 mb-4">Please provide a valid reason for delivery cancellation.</p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder="Reason for cancellation..."
            className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 focus:border-rose-400 focus:outline-none resize-none mb-4"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setCancelModal(null);
                setCancelReason('');
              }}
              className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting || !cancelReason.trim()}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Cancelling...' : 'Confirm Cancel'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CancelModal;
