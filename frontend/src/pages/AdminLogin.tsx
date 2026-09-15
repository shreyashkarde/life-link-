import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { HeartbeatLoader } from '../components/ui/HeartbeatLoader';

export const AdminLogin: React.FC = () => {
  const { user, login, apiFetch } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN_HOSPITAL') navigate('/hospital');
      else if (user.role === 'SUPER_ADMIN') navigate('/super-admin');
      else if (user.role === 'PATIENT') navigate('/patient');
      else if (user.role === 'DRIVER') navigate('/driver');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiFetch('/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      login(data.token, data.user);
      navigate('/hospital');
    } catch (err: any) {
      setError(err.message || 'Login failed. Invalid administrative credentials.');
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
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[130px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[130px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-3xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-650 dark:from-white dark:via-slate-200 dark:to-emerald-400 bg-clip-text text-transparent">
            LifeLink ER
          </span>
        </div>
        <h2 className="mt-4 text-center text-xs font-semibold tracking-wider text-slate-505 dark:text-emerald-450 uppercase font-mono">
          Hospital Administrative Portal
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-2xl relative transition-colors">
          
          <div className="flex items-center gap-2.5 mb-6 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-bold tracking-tight">Staff Authentication Gate</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Admin Email Address
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
                  placeholder="admin.sfgeneral@lifelink.com"
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-emerald-500 transition-colors text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-505 dark:text-slate-400 uppercase tracking-wider mb-2">
                Admin Password
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
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-emerald-500 transition-colors text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/10 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <HeartbeatLoader size="small" strokeColor="#ffffff" />
              ) : (
                <>
                  Enter ER Console
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex gap-2 pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setEmail('admin.sfgeneral@lifelink.com');
                setPassword('password123');
              }}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-3xs rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Demo: SF General
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('admin.ucsf@lifelink.com');
                setPassword('password123');
              }}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-3xs rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Demo: UCSF
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="hover:text-emerald-500 transition-colors cursor-pointer"
            >
              ← Patient / Driver Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
