import React, { useState } from 'react';

/**
 * 🔑 ForgotPasswordModal.jsx
 * "Secure token-based email verification and password reset system with expiration and hashing."
 */
export const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      setStatus(null);
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus({
          type: 'success',
          message: 'Password reset link generated! Check your email or use the secure recovery link below.',
          link: data.resetLink,
          expiresInMinutes: data.expiresInMinutes || 30,
        });
      } else {
        setStatus({ type: 'error', message: data.message || 'Failed to send reset link.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
              🔐
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Forgot Password?</h3>
              <p className="text-[11px] text-gray-500">Secure SHA-256 Token Recovery</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-base font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed">
          Enter your registered email address below. We'll generate a secure 30-minute password reset link and dispatch it to your inbox.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. patient@lifelink.com"
              required
              className="w-full text-xs px-3.5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all"
            />
          </div>

          {status && (
            <div
              className={`p-3.5 rounded-2xl text-xs space-y-2 ${
                status.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-red-50 text-red-900 border border-red-200'
              }`}
            >
              <div className="flex items-start gap-2">
                <span>{status.type === 'success' ? '✅' : '⚠️'}</span>
                <p className="font-semibold leading-relaxed">{status.message}</p>
              </div>
              {status.link && (
                <div className="pt-1 border-t border-emerald-200/60">
                  <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mb-1">
                    Direct Reset Link (Expires in {status.expiresInMinutes} mins):
                  </p>
                  <a
                    href={status.link}
                    className="block text-[11px] text-blue-700 underline truncate hover:text-blue-900 font-medium"
                  >
                    🔗 {status.link}
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#1e2e6e] hover:bg-[#162354] rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'Sending Request...' : 'Send Recovery Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
