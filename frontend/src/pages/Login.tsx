import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ForgotPasswordModal from '../features/auth/ForgotPasswordModal';
import GoogleLoginButton from '../features/auth/GoogleLoginButton';
import { apiClient } from '../services/apiClient';

export interface LoginProps {
  embedded?: boolean;
  initialMode?: 'Login' | 'Sign Up';
}

export const Login: React.FC<LoginProps> = ({ embedded = false, initialMode = 'Login' }) => {
  const [state, setState] = useState<'Login' | 'Sign Up'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('English (Ingles)');
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);

  const navigate = useNavigate();
  const { backendUrl, setToken, setDToken, setAToken, showToast } = useApp();

  // Role-based automatic redirect helper
  const handleRoleRouting = (role: string, targetToken: string) => {
    const normalizedRole = (role || 'PATIENT').toUpperCase();

    // 1. Clear any conflicting old tokens first
    sessionStorage.clear();
    setToken('');
    setAToken('');
    setDToken('');

    // 2. Set only the required token for the authenticated role
    switch (normalizedRole) {
      case 'DOCTOR':
        setDToken(targetToken);
        sessionStorage.setItem('dToken', targetToken);
        showToast('Welcome, Doctor! Redirecting to Doctor Workspace...', 'success');
        navigate('/doctor/dashboard', { replace: true });
        break;

      case 'ADMIN_HOSPITAL':
      case 'HOSPITAL_ADMIN':
        setAToken(targetToken);
        sessionStorage.setItem('aToken', targetToken);
        showToast('Welcome, Hospital Administrator! Redirecting to Hospital Desk...', 'success');
        navigate('/hospital/dashboard', { replace: true });
        break;

      case 'DRIVER':
        setToken(targetToken);
        sessionStorage.setItem('token', targetToken);
        showToast('Welcome, Paramedic Driver! Redirecting to Ambulance Dashboard...', 'success');
        navigate('/driver/dashboard', { replace: true });
        break;

      case 'SUPER_ADMIN':
      case 'ADMIN':
        setAToken(targetToken);
        sessionStorage.setItem('aToken', targetToken);
        showToast('Welcome, Super Administrator! Redirecting to Master Console...', 'success');
        navigate('/super-admin/dashboard', { replace: true });
        break;

      case 'PATIENT':
      default:
        setToken(targetToken);
        sessionStorage.setItem('token', targetToken);
        showToast('Welcome to LifeLink Healthcare! Redirecting to Patient Portal...', 'success');
        navigate('/patient/dashboard', { replace: true });
        break;
    }
  };

  const handleResendVerification = async (targetEmail: string) => {
    try {
      setResendingVerification(true);
      const { data } = await apiClient.post('/api/auth/resend-verification', {
        email: targetEmail.trim().toLowerCase(),
      });
      if (data.success) {
        showToast('Verification email sent! Please check your inbox.', 'success');
      } else {
        showToast(data.message || 'Failed to resend verification email.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error resending verification email.', 'error');
    } finally {
      setResendingVerification(false);
    }
  };

  const onSubmitHandler = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setUnverifiedEmail(null);

    try {
      if (state === 'Sign Up') {
        const { data } = await apiClient.post('/api/auth/register', {
          name: name || email.split('@')[0],
          email: email.trim().toLowerCase(),
          password,
          role: 'PATIENT',
        });

        if (data.success) {
          if (rememberMe) localStorage.setItem('remembered_email', email);
          showToast(
            'Registration successful! Please check your email inbox to verify your account.',
            'success'
          );
          // If in dev/fallback with a direct preview, toast a notification
          if (data.verificationToken) {
            console.log('Verification Token:', data.verificationToken);
          }
          setState('Login');
        } else {
          showToast(data.message || 'Registration failed', 'error');
        }
      } else {
        // Unified single login for all 5 roles
        const { data } = await apiClient.post('/api/auth/login', {
          email: email.trim().toLowerCase(),
          password,
        });

        if (data.success) {
          if (rememberMe) localStorage.setItem('remembered_email', email);
          handleRoleRouting(data.user?.role || 'PATIENT', data.token);
        } else {
          showToast(data.message || 'Invalid email or password', 'error');
        }
      }
    } catch (error: any) {
      if (error.response?.data?.isUnverified) {
        const targetEmail = error.response.data.email || email;
        setUnverifiedEmail(targetEmail);
        showToast(error.response.data.message || 'Please verify your email before logging in.', 'error');
      } else {
        showToast(error.response?.data?.message || 'Authentication error. Please check your credentials.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Fast Direct Role Login
  const handleInstantLogin = async (targetEmail: string, targetPass: string) => {
    setEmail(targetEmail);
    setPassword(targetPass);
    setState('Login');
    setLoading(true);
    setUnverifiedEmail(null);

    try {
      const { data } = await apiClient.post('/api/auth/login', {
        email: targetEmail.trim().toLowerCase(),
        password: targetPass,
      });

      if (data.success) {
        handleRoleRouting(data.user?.role || 'PATIENT', data.token);
      } else {
        showToast(data.message || 'Login failed', 'error');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Authentication error. Please check your credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillRoleCredentials = (targetEmail: string, targetPass: string) => {
    handleInstantLogin(targetEmail, targetPass);
  };

  return (
    <div className={embedded ? "w-full flex items-center justify-center font-sans" : "min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-6 md:p-10 font-sans"}>
      <ForgotPasswordModal isOpen={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)} />

      {/* Main Dual-Pane Card Container */}
      <div className="bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl border border-gray-100 max-w-5xl w-full overflow-hidden flex flex-col md:flex-row min-h-[640px]">
        {/* Left Side: Desktop Curved Hero Banner (Hidden on Mobile) */}
        <div className="hidden md:block md:w-1/2 relative overflow-hidden bg-slate-900 select-none">
          <img
            src="/login_hero.jpg"
            alt="Healthcare and family lifestyle"
            className="w-full h-full object-cover object-center filter contrast-[1.05]"
          />

          {/* Soft-Blue Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#1e2e6e]/80 via-[#253275]/50 to-blue-400/30 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-blue-900/20 backdrop-blur-[0.5px]"></div>

          {/* Organic Wave S-Curve Overlay for Desktop */}
          <svg
            className="absolute -right-1 top-0 bottom-0 h-full w-14 text-white fill-current pointer-events-none"
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
          >
            <path d="M0,0 C60,250 80,400 30,650 C-10,850 50,950 100,1000 L100,0 Z" />
          </svg>

          {/* Subtle Floating Tag */}
          <div className="absolute bottom-8 left-8 text-white z-10 max-w-xs space-y-1">
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-semibold tracking-wide border border-white/30">
              Unified Healthcare Access
            </span>
            <p className="text-xs text-white/90 leading-relaxed drop-shadow">
              One login for Patients, Doctors, Hospitals, Ambulance Drivers, and Administrators.
            </p>
          </div>
        </div>

        {/* Right Side: Clean Form Panel */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 lg:p-12 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Logo & Tagline */}
            <div className="text-center pt-2 flex flex-col items-center">
              <img
                src="/lifelink_logo.png"
                alt="LifeLink Logo"
                className="w-16 h-16 object-contain rounded-full shadow-md mb-2 hover:scale-105 transition-transform"
              />
              <div className="inline-flex items-center justify-center gap-1">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 flex items-center">
                  <span className="text-blue-600">Life</span>Link
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-gray-600 mt-0.5">
                CARE CONNECTS LIVES
              </p>
            </div>

            {/* Login / Sign Up Form */}
            <form onSubmit={onSubmitHandler} className="space-y-4 max-w-sm mx-auto w-full">
              {/* Name Field (Sign Up Only) */}
              {state === 'Sign Up' && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Edward Vincent"
                    className="w-full text-xs px-3.5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e2e6e]/20 focus:border-[#1e2e6e] text-gray-800 transition-all placeholder:text-gray-400"
                  />
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-gray-400 text-sm pointer-events-none">
                    ✉
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full text-xs pl-10 pr-3.5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e2e6e]/20 focus:border-[#1e2e6e] text-gray-800 transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full text-xs pl-3.5 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e2e6e]/20 focus:border-[#1e2e6e] text-gray-800 transition-all placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-gray-400 hover:text-gray-700 text-sm focus:outline-none transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-gray-600 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#1e2e6e] focus:ring-[#1e2e6e]"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-blue-600 hover:text-[#1e2e6e] font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Unverified Email Warning Banner */}
              {unverifiedEmail && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2 text-amber-900 animate-in fade-in duration-200">
                  <div className="flex items-start gap-2">
                    <span className="text-base">⚠️</span>
                    <div>
                      <p className="font-bold">Email Verification Required</p>
                      <p className="text-[11px] text-amber-800 leading-tight">
                        Please verify your account via the link sent to <strong>{unverifiedEmail}</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={resendingVerification}
                    onClick={() => handleResendVerification(unverifiedEmail)}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-[11px] transition-colors disabled:opacity-50"
                  >
                    {resendingVerification ? 'Sending Email...' : 'Resend Verification Email'}
                  </button>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-full bg-[#1e2e6e] hover:bg-[#162354] active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-[#1e2e6e]/20 transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? 'Authenticating...' : state === 'Sign Up' ? 'Create account' : 'Log in'}
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-gray-200 w-full"></div>
                <span className="bg-white px-3 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  or continue with
                </span>
                <div className="border-t border-gray-200 w-full"></div>
              </div>

              {/* Google OAuth Login Button */}
              <GoogleLoginButton
                onSuccess={(data) => handleRoleRouting(data.user?.role || 'PATIENT', data.token)}
                onError={(err) => showToast(err, 'error')}
              />

              {/* Switch Sign Up / Log In */}
              <div className="text-center text-xs text-gray-600 pt-1">
                {state === 'Login' ? (
                  <span>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setState('Sign Up');
                        setUnverifiedEmail(null);
                      }}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Sign up.
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setState('Login');
                        setUnverifiedEmail(null);
                      }}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Log in.
                    </button>
                  </span>
                )}
              </div>
            </form>

            {/* 1-Click Fast 5-Role Credentials Switcher */}
            <div className="max-w-sm mx-auto w-full pt-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <span>⚡</span> 1-Click Fast Test Logins (5 Roles):
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => fillRoleCredentials('patient@prescripto.com', 'password123')}
                    className="p-1.5 bg-white hover:bg-blue-50 hover:text-blue-700 rounded-lg border border-gray-200 font-semibold text-gray-700 text-left transition-colors flex items-center gap-1"
                  >
                    <span>👤</span> Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => fillRoleCredentials('doc1@prescripto.com', 'doc123')}
                    className="p-1.5 bg-white hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-gray-200 font-semibold text-gray-700 text-left transition-colors flex items-center gap-1"
                  >
                    <span>👨‍⚕️</span> Doctor
                  </button>
                  <button
                    type="button"
                    onClick={() => fillRoleCredentials('hospital@prescripto.com', 'hospital123')}
                    className="p-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 rounded-lg border border-gray-200 font-semibold text-gray-700 text-left transition-colors flex items-center gap-1"
                  >
                    <span>🏥</span> Hospital
                  </button>
                  <button
                    type="button"
                    onClick={() => fillRoleCredentials('driver1@prescripto.com', 'driver123')}
                    className="p-1.5 bg-white hover:bg-red-50 hover:text-red-700 rounded-lg border border-gray-200 font-semibold text-gray-700 text-left transition-colors flex items-center gap-1"
                  >
                    <span>🚑</span> Driver
                  </button>
                  <button
                    type="button"
                    onClick={() => fillRoleCredentials('admin@prescripto.com', 'admin123')}
                    className="p-1.5 bg-white hover:bg-purple-50 hover:text-purple-700 rounded-lg border border-gray-200 font-semibold text-gray-700 text-left transition-colors flex items-center gap-1 sm:col-span-2"
                  >
                    <span>👑</span> Super Admin
                  </button>
                </div>
              </div>
            </div>

            {/* App Store & Google Play Badges */}
            <div className="max-w-sm mx-auto w-full pt-1">
              <div className="flex items-center justify-center gap-3">
                <a
                  href="https://apple.com/app-store"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 bg-black text-white px-3.5 py-2 rounded-xl flex items-center gap-2 hover:bg-gray-800 transition-all shadow-sm"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.17.65-2.83 1.42-.58.66-1.1 1.74-1.01 2.8 1.08.08 2.22-.6 2.83-1.35z" />
                  </svg>
                  <div className="text-left leading-tight">
                    <p className="text-[8px] uppercase tracking-wider text-gray-300 font-medium">Download on the</p>
                    <p className="text-xs font-bold tracking-tight">App Store</p>
                  </div>
                </a>

                <a
                  href="https://play.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 bg-black text-white px-3.5 py-2 rounded-xl flex items-center gap-2 hover:bg-gray-800 transition-all shadow-sm"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M3.609 1.814L13.793 12 3.61 22.186c-.37-.417-.61-.986-.61-1.636V3.45c0-.65.24-1.219.61-1.636zM15.207 13.414l2.586 2.586-11.884 6.793 9.298-9.379zm0-2.828L5.909 1.207l11.884 6.793-2.586 2.586zm1.414 1.414l3.197 1.827c.928.53.928 1.4 0 1.93l-3.197 1.827-2.121-2.121 2.121-2.121z" />
                  </svg>
                  <div className="text-left leading-tight">
                    <p className="text-[8px] uppercase tracking-wider text-gray-300 font-medium">GET IT ON</p>
                    <p className="text-xs font-bold tracking-tight">Google Play</p>
                  </div>
                </a>
              </div>

              <p className="text-[10px] text-gray-400 text-center mt-3 leading-relaxed">
                By creating an account or logging in, you agree to the current{' '}
                <a href="#terms" className="underline hover:text-gray-600">Terms of Service</a> and{' '}
                <a href="#privacy" className="underline hover:text-gray-600">Privacy Policy</a>
              </p>
            </div>
          </div>

          {/* Footer Bar: Language & Support */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 max-w-sm mx-auto w-full">
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-gray-600 text-xs font-medium cursor-pointer focus:outline-none hover:text-gray-900"
              >
                <option value="English (Ingles)">English (Ingles) ▾</option>
                <option value="Español">Español</option>
                <option value="Français">Français</option>
                <option value="Hindi">हिन्दी</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="flex items-center gap-1.5 hover:text-blue-600 font-medium transition-colors"
            >
              <span>💬</span>
              <span>Get Support</span>
            </button>
          </div>
        </div>
      </div>

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span>💬</span> LifeLink Customer Support
              </h3>
              <button onClick={() => setShowSupportModal(false)} className="text-gray-400 hover:text-gray-600 text-xs">
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Need assistance with your account or medical booking? Our 24/7 healthcare support team is here to help.
            </p>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
              <p><strong>📞 Emergency Helpline:</strong> 108 / 102</p>
              <p><strong>✉️ Email:</strong> support@lifelink.com</p>
              <p><strong>⏰ Hours:</strong> 24/7 Real-Time Triage</p>
            </div>
            <button
              onClick={() => setShowSupportModal(false)}
              className="w-full py-2 bg-[#1e2e6e] text-white rounded-xl text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
