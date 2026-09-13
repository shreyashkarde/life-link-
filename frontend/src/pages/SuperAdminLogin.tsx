import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldAlert, Mail, Lock, Key, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { HeartbeatLoader } from '../components/ui/HeartbeatLoader';

export const SuperAdminLogin: React.FC = () => {
  const { user, login, apiFetch } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-redirect if session is active
  useEffect(() => {
    if (user) {
      if (user.role === 'SUPER_ADMIN') navigate('/super-admin');
      else if (user.role === 'ADMIN_HOSPITAL') navigate('/hospital');
      else if (user.role === 'PATIENT') navigate('/patient');
      else if (user.role === 'DRIVER') navigate('/driver');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiFetch('/auth/super-admin-login', {
        method: 'POST',
        body: JSON.stringify({ email, password, totpCode }),
      });

      login(data.token, data.user);
      navigate('/super-admin');
    } catch (err: any) {
      setError(err.message || 'Login failed. Verify email, password, and TOTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 overflow-hidden font-sans transition-colors">
      {/* Floating Theme Toggle */}
      <div className="absolute top-6 right-6 z-30">
        <ThemeToggle />
      </div>

      {/* Background glowing decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-600/10 blur-[130px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[130px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-3xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-650 dark:from-white dark:via-slate-200 dark:to-rose-400 bg-clip-text text-transparent">
            LifeLink Grid
          </span>
        </div>
        <h2 className="mt-4 text-center text-xs font-semibold tracking-wider text-slate-505 dark:text-rose-550 uppercase font-mono">
          System Control Vault
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-2xl relative transition-colors">
          
          <div className="flex items-center gap-2.5 mb-6 text-rose-600 dark:text-rose-550">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-bold tracking-tight">Root Command Keyway</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Super User Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-450">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superadmin@lifelink.com"
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-202 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-rose-500 transition-colors text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Master Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-455">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-202 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-rose-500 transition-colors text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>2FA TOTP Security Token</span>
                <button
                  type="button"
                  onClick={() => setTotpCode('123456')}
                  className="text-[9px] text-rose-500 hover:text-rose-400 font-bold underline lowercase normal-case tracking-normal cursor-pointer"
                >
                  Fill Demo Code (123456)
                </button>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-455">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="e.g. 123456"
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-202 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-rose-500 transition-colors text-xs text-center font-mono tracking-widest text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-505 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/10 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <HeartbeatLoader size="small" strokeColor="#ffffff" />
              ) : (
                <>
                  Authenticate & Unlock
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80 text-center">
            <button
              type="button"
              onClick={() => {
                setEmail('superadmin@lifelink.com');
                setPassword('password123');
                setTotpCode('123456');
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-3xs rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Autofill Master Credentials & Demo 2FA Code (123456)
            </button>

            <div className="mt-4 flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => navigate('/admin/login')}
                className="hover:text-emerald-500 transition-colors cursor-pointer"
              >
                ← Hospital Staff Portal
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="hover:text-rose-500 transition-colors cursor-pointer"
              >
                Patient / Driver Portal →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
