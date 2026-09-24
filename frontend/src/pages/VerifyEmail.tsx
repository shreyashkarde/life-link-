import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { apiClient } from '../services/apiClient';

/**
 * 📧 VerifyEmail.tsx
 * "Secure token-based email verification and password reset system with expiration and hashing."
 */
export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { backendUrl, setToken, showToast } = useApp();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token provided in the URL.');
      return;
    }

    const performVerification = async () => {
      try {
        const { data } = await apiClient.get(`/api/auth/verify-email?token=${token}`);
        if (data.success) {
          setStatus('success');
          if (data.token) {
            setToken(data.token);
            sessionStorage.setItem('token', data.token);
          }
          showToast('Email verified successfully! Welcome to LifeLink Healthcare.', 'success');
        } else {
          setStatus('error');
          setErrorMessage(data.message || 'Verification failed.');
        }
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(
          error.response?.data?.message || 'Invalid or expired verification link. Please request a new link below.'
        );
      }
    };

    performVerification();
  }, [token, backendUrl, setToken, showToast]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    try {
      setResendLoading(true);
      const { data } = await apiClient.post('/api/auth/resend-verification', {
        email: resendEmail.trim().toLowerCase(),
      });
      if (data.success) {
        setResendSuccess(true);
        showToast('A new verification email has been dispatched.', 'success');
      } else {
        showToast(data.message || 'Failed to resend email.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error sending verification email.', 'error');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl border border-gray-100 max-w-md w-full p-8 sm:p-10 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Brand */}
        <div className="flex flex-col items-center justify-center gap-2">
          <img
            src="/lifelink_logo.png"
            alt="LifeLink Logo"
            className="w-14 h-14 object-contain rounded-full shadow-md"
          />
          <span className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center">
            <span className="text-blue-600">Life</span>Link
          </span>
        </div>

        {status === 'verifying' && (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-[#1e2e6e] rounded-full animate-spin mx-auto"></div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-gray-900">Verifying Your Email...</h2>
              <p className="text-xs text-gray-500">
                Checking your secure 24-hour verification token.
              </p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-5">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner animate-bounce">
              ✓
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">Email Verified!</h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                Your email address has been verified. Your healthcare account is now fully active with access to appointments, live ambulance dispatch, and hospital admissions.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => navigate('/patient/dashboard')}
                className="w-full py-3.5 px-6 rounded-full bg-[#1e2e6e] hover:bg-[#162354] text-white text-xs font-bold shadow-lg shadow-[#1e2e6e]/20 transition-all cursor-pointer"
              >
                Go to Patient Dashboard
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 px-6 rounded-full bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-semibold transition-all"
              >
                Return to Login
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-5 text-left">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl mb-3">
                ⚠️
              </div>
              <h2 className="text-lg font-bold text-gray-900">Verification Link Invalid</h2>
              <p className="text-xs text-gray-600 mt-1">{errorMessage}</p>
            </div>

            {resendSuccess ? (
              <div className="p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl text-xs space-y-1 text-center">
                <p className="font-bold">✉️ New Link Sent!</p>
                <p className="text-[11px] text-emerald-700">
                  Please check your inbox or spam folder for your new verification link.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3 pt-2 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-700">
                  Resend Verification Email
                </label>
                <div className="space-y-2">
                  <input
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={resendLoading}
                    className="w-full py-2.5 px-4 bg-[#1e2e6e] text-white text-xs font-bold rounded-xl hover:bg-[#162354] transition-all disabled:opacity-50"
                  >
                    {resendLoading ? 'Sending...' : 'Send New Verification Link'}
                  </button>
                </div>
              </form>
            )}

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs text-blue-600 hover:underline font-semibold">
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
