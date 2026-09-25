import React from 'react';

export interface OtpModalProps {
  setOtpModal: (otpModal: string | null) => void;
  otp: string;
  setOtp: (otp: string) => void;
  handleComplete: () => void;
  submitting: boolean;
}

export const OtpModal: React.FC<OtpModalProps> = ({
  setOtpModal,
  otp,
  setOtp,
  handleComplete,
  submitting,
}) => {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-xs" onClick={() => setOtpModal(null)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 animate-in fade-in duration-200 pointer-events-auto">
          <h3 className="text-lg font-bold text-emerald-700 mb-1 flex items-center gap-2">
            <span>🔑</span> Enter Delivery OTP
          </h3>
          <p className="text-xs text-slate-500 mb-5">Ask the customer for the 6-digit OTP shown on their tracking page.</p>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none mb-4 font-bold text-slate-800"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setOtpModal(null);
                setOtp('');
              }}
              className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={otp.length !== 6 || submitting}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Verifying...' : 'Confirm Delivery'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default OtpModal;
