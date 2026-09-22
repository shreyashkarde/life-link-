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
  Eye,
  EyeOff,
  Radio,
  CheckCircle2,
  Stethoscope,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, googleLogin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    {
      role: 'PATIENT',
      name: 'Patient Account',
      email: 'patient@lifelink.com',
      password: 'password123',
      icon: HeartPulse,
      badge: 'Patient',
      accent: 'text-rose-600 bg-rose-50 border-rose-200/80',
    },
    {
      role: 'DOCTOR',
      name: 'Dr. Rajesh Sharma',
      email: 'doctor1@lifelink.com',
      password: 'password123',
      icon: Stethoscope,
      badge: 'Doctor',
      accent: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
    },
    {
      role: 'DRIVER',
      name: 'Vikram Singh (Paramedic)',
      email: 'driver1@lifelink.com',
      password: 'password123',
      icon: Truck,
      badge: 'Driver',
      accent: 'text-cyan-600 bg-cyan-50 border-cyan-200/80',
    },
    {
      role: 'ADMIN_HOSPITAL',
      name: 'Hospital Director Sarah',
      email: 'admin@hospital.com',
      password: 'password123',
      icon: UserCheck,
      badge: 'Hospital Admin',
      accent: 'text-amber-600 bg-amber-50 border-amber-200/80',
    },
    {
      role: 'SUPER_ADMIN',
      name: 'Dr. Vance (Super Admin)',
      email: 'superadmin@lifelink.com',
      password: 'password123',
      icon: ShieldCheck,
      badge: 'Super Admin',
      accent: 'text-indigo-600 bg-indigo-50 border-indigo-200/80',
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
      addToast('success', `Signed in as ${demo.badge}: ${user.name}`);
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
    <div className="min-h-screen bg-[#F8FAFC] flex items-stretch">
      {/* Left Column: Luxury Dark-Mode Brand Showcase (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 mesh-ambient-dark text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Ambient radial blur orbs */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand Tag */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-soft ring-2 ring-white/10 group-hover:scale-105 transition-transform">
              <HeartPulse className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="font-black text-2xl tracking-tight text-white">
                LifeLink<span className="text-cyan-400">.</span>
              </span>
              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                Executive Healthcare Suite
              </p>
            </div>
          </Link>
        </div>

        {/* Middle Value Proposition Card */}
        <div className="relative z-10 space-y-6 my-auto max-w-lg">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-cyan-300 text-xs font-mono font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>Autonomous Emergency Healthcare Grid</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white leading-snug">
            Real-time critical medical response powered by <span className="gradient-text-light">intelligent GPS telemetry</span>.
          </h2>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed font-medium italic">
              "LifeLink synchronizes emergency ambulances, ICU triage, and specialist consultations into one unified, sub-second telemetry pipeline."
            </p>
            <div className="flex items-center gap-3 pt-2 border-t border-white/10">
              <div className="w-8 h-8 rounded-full bg-blue-500/30 border border-blue-400/40 flex items-center justify-center text-xs font-bold text-cyan-300">
                DR
              </div>
              <div>
                <p className="text-xs font-bold text-white">Dr. Sarah Vance, MD</p>
                <p className="text-[10px] text-slate-400">Director of Emergency Trauma Services</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Sub-5 Min Ambulance SLA</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Live Leaflet Map Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              <span>5 Integrated Role Portals</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              <span>Instant Fallback Engine</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-500">
          <span>Protected by 256-Bit SSL Encryption</span>
          <span>Mumbai Metropolitan Grid</span>
        </div>
      </div>

      {/* Right Column: Authentication Card */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 relative">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div>
            <div className="flex items-center gap-2 lg:hidden mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <span className="font-black text-xl text-surface-900">LifeLink.</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-surface-900 tracking-tight">
              Welcome back
            </h2>
            <p className="text-xs text-surface-500 mt-1 font-medium">
              Select your role or enter credentials to access your portal
            </p>
          </div>

          {/* Quick Demo Logins Bar */}
          <div className="p-4 rounded-2xl bg-surface-100/80 border border-surface-200/80">
            <div className="flex items-center justify-between text-xs font-bold text-surface-700 mb-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Instant 1-Click Role Logins:</span>
              </div>
              <span className="text-[10px] text-surface-400 uppercase font-mono">Sandbox</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {demoAccounts.map((demo) => {
                const Icon = demo.icon;
                return (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => handleQuickDemoLogin(demo)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all text-xs font-semibold ${demo.accent} hover:shadow-xs hover:scale-[1.02]`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{demo.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-surface-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-xs"
                  required
                />
                <Mail className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-bold text-surface-700">
                  Password
                </label>
                <span className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-xs"
                  required
                />
                <Lock className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-surface-400 hover:text-surface-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all shadow-glow-blue hover:shadow-blue-600/40 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-surface-200" />
            <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Or continue with</span>
            <div className="flex-1 border-t border-surface-200" />
          </div>

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleMock}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-surface-200 bg-white hover:bg-surface-50 text-surface-700 text-xs font-bold transition-all shadow-xs"
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
            <span>Sign in with Google Account</span>
          </button>

          <p className="text-center text-xs text-surface-500 font-medium">
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
