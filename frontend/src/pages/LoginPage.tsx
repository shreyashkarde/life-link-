import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  HeartPulse,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  UserCheck,
  Truck,
  Activity,
  ShieldCheck,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, googleLogin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    {
      role: 'PATIENT',
      name: 'Patient Account',
      email: 'patient@lifelink.com',
      password: 'password123',
      icon: HeartPulse,
      color: 'bg-rose-50 text-rose-600 border-rose-200',
      badge: 'Patient',
    },
    {
      role: 'DOCTOR',
      name: 'Dr. Rajesh Sharma',
      email: 'doctor1@lifelink.com',
      password: 'password123',
      icon: Activity,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      badge: 'Doctor',
    },
    {
      role: 'DRIVER',
      name: 'Vikram Singh (Paramedic)',
      email: 'driver1@lifelink.com',
      password: 'password123',
      icon: Truck,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
      badge: 'Driver',
    },
    {
      role: 'ADMIN_HOSPITAL',
      name: 'Hospital Director Sarah',
      email: 'admin@hospital.com',
      password: 'password123',
      icon: UserCheck,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
      badge: 'Hospital Admin',
    },
    {
      role: 'SUPER_ADMIN',
      name: 'Dr. Vance (Super Admin)',
      email: 'superadmin@lifelink.com',
      password: 'password123',
      icon: ShieldCheck,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      badge: 'Super Admin',
    },
  ];

  const handleRedirect = (role: string) => {
    switch (role) {
      case 'PATIENT':
        navigate('/patient');
        break;
      case 'DOCTOR':
        navigate('/doctor');
        break;
      case 'DRIVER':
        navigate('/driver');
        break;
      case 'ADMIN_HOSPITAL':
        navigate('/admin/hospital');
        break;
      case 'SUPER_ADMIN':
        navigate('/admin/super');
        break;
      default:
        navigate('/patient');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login({ email, password });
      addToast('success', `Welcome back, ${user.name}!`);
      handleRedirect(user.role);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demo: typeof demoAccounts[0]) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setLoading(true);

    try {
      const user = await login({ email: demo.email, password: demo.password });
      addToast('success', `Logged in as demo ${demo.badge}: ${user.name}`);
      handleRedirect(user.role);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleMock = async () => {
    setLoading(true);
    try {
      const user = await googleLogin({
        email: 'patient.google@lifelink.com',
        name: 'Google Verified User',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        role: 'PATIENT',
      });
      addToast('success', `Logged in with Google as ${user.name}`);
      navigate('/patient');
    } catch (err: any) {
      addToast('error', 'Google Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-soft mb-3">
          <HeartPulse className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black text-surface-900 tracking-tight">Sign in to LifeLink</h2>
        <p className="text-xs text-surface-500 mt-1">Access your healthcare or emergency dispatch portal</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-surface-100 shadow-card">
          {/* Quick Demo Logins Bar */}
          <div className="mb-6 p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>1-Click Instant Demo Logins (5 Roles):</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {demoAccounts.map((demo) => {
                const Icon = demo.icon;
                return (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => handleQuickDemoLogin(demo)}
                    className="flex items-center gap-2 p-2 rounded-xl bg-white border border-surface-200 hover:border-blue-500 hover:bg-blue-50 text-left transition-all text-xs font-semibold text-surface-800"
                  >
                    <Icon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{demo.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-surface-700 mb-1">Email Address</label>
              <div className="relative">
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  required
                />
                <Mail className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-xs font-semibold text-surface-700">Password</label>
                <span className="text-[11px] text-blue-600 hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  required
                />
                <Lock className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-soft disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 border-t border-surface-200" />
            <span className="text-[11px] text-surface-400 font-semibold uppercase">Or continue with</span>
            <div className="flex-1 border-t border-surface-200" />
          </div>

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleMock}
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-surface-200 bg-white hover:bg-surface-50 text-surface-700 text-xs font-semibold transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          <p className="text-center text-xs text-surface-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-blue-600 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
