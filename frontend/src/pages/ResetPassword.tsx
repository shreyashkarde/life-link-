import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../context/AppContext';

/**
 * 🔑 ResetPassword.tsx
 * "Secure token-based email verification and password reset system with expiration and hashing."
 */
export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { backendUrl, showToast } = useApp();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      showToast('Password reset token is missing from the link.', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match. Please re-enter.', 'error');
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.post(`${backendUrl}/api/auth/reset-password`, {
        token,
        newPassword,
      });

      if (data.success) {
        setIsSuccess(true);
        showToast('Password reset successfully! You can now log in.', 'success');
      } else {
        showToast(data.message || 'Failed to reset password.', 'error');
      }
    } catch (error: any) {
      showToast(
        error.response?.data?.message || 'Invalid or expired password reset link. Please request a new one.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl border border-gray-100 max-w-md w-full p-8 sm:p-10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-1">
            <span className="text-3xl font-extrabold tracking-tight text-[#1e2e6e]">
              b<span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full mx-0.5 animate-pulse"></span>well
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Create New Password</h2>
          <p className="text-xs text-gray-500">
            Secure SHA-256 Token-Based Recovery
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-5 text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">
              ✓
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-gray-900">Password Updated Successfully</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Your password has been securely reset. You can now log into your b.well account with your new credentials.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3.5 px-6 rounded-full bg-[#1e2e6e] hover:bg-[#162354] text-white text-xs font-bold shadow-lg shadow-[#1e2e6e]/20 transition-all cursor-pointer"
            >
              Proceed to Login
            </button>
          </div>
        ) : !token ? (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-900">Missing Reset Token</h3>
              <p className="text-xs text-gray-600">
                This reset link is invalid or incomplete. Please request a new password recovery link.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-block w-full py-3 px-6 rounded-full bg-[#1e2e6e] text-white text-xs font-bold shadow-md hover:bg-[#162354] transition-all"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full text-xs pl-3.5 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e2e6e]/20 focus:border-[#1e2e6e] text-gray-800 transition-all placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-gray-400 hover:text-gray-700 text-sm focus:outline-none"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full text-xs px-3.5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e2e6e]/20 focus:border-[#1e2e6e] text-gray-800 transition-all placeholder:text-gray-400"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-gray-600 space-y-1">
              <p className="font-semibold text-gray-700">🔒 Password Requirements:</p>
              <p className={newPassword.length >= 6 ? 'text-emerald-600 font-medium' : 'text-gray-500'}>
                • Minimum 6 characters
              </p>
              <p
                className={
                  confirmPassword && newPassword === confirmPassword
                    ? 'text-emerald-600 font-medium'
                    : 'text-gray-500'
                }
              >
                • Passwords match
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-full bg-[#1e2e6e] hover:bg-[#162354] active:scale-[0.99] text-white text-xs font-bold shadow-lg shadow-[#1e2e6e]/20 transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? 'Updating Password...' : 'Save New Password'}
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs text-blue-600 hover:underline font-semibold">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
