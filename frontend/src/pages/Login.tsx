import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Truck, User, ArrowRight, Lock, Mail, Heart, Phone, ShieldAlert } from 'lucide-react';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { HeartbeatLoader } from '../components/ui/HeartbeatLoader';

export const Login: React.FC = () => {
  const { user, login, apiFetch } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect if session is active
  useEffect(() => {
    if (user) {
      if (user.role === 'PATIENT') navigate('/patient');
      else if (user.role === 'DRIVER') navigate('/driver');
      else if (user.role === 'ADMIN_HOSPITAL') navigate('/hospital');
      else if (user.role === 'SUPER_ADMIN') navigate('/super-admin');
    }
  }, [user, navigate]);

  const [activeTab, setActiveTab] = useState<'PATIENT' | 'DRIVER'>('PATIENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Google OAuth state
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);
  const [showGoogleSetup, setShowGoogleSetup] = useState(false);
  const [googleSetupRole, setGoogleSetupRole] = useState<'PATIENT' | 'DRIVER'>('PATIENT');
  const [googleSetupPhone, setGoogleSetupPhone] = useState('');
  
  // Google Patient Profile state
  const [googleSetupBlood, setGoogleSetupBlood] = useState('O+');
  const [googleSetupAllergies, setGoogleSetupAllergies] = useState('');
  const [googleSetupContactName, setGoogleSetupContactName] = useState('');
  const [googleSetupContactPhone, setGoogleSetupContactPhone] = useState('');
  const [googleSetupNotes, setGoogleSetupNotes] = useState('');
  
  // Google Driver Vehicle state
  const [googleSetupVehicle, setGoogleSetupVehicle] = useState('');
  const [googleSetupAmbType, setGoogleSetupAmbType] = useState('BASIC_LIFE_SUPPORT');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      login(data.token, data.user);
      if (data.user.role === 'PATIENT') navigate('/patient');
      else navigate('/driver');
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Google GSI Handler
  const handleGoogleCredentialResponse = async (response: any) => {
    const idToken = response.credential;
    setGoogleCredential(idToken);
    setError('');

    try {
      setLoading(true);
      const data = await apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential: idToken, role: activeTab }),
      });

      if (data.isNewUser) {
        setGoogleSetupRole(activeTab);
        setShowGoogleSetup(true);
      } else {
        login(data.token, data.user);
        if (data.user.role === 'PATIENT') navigate('/patient');
        else navigate('/driver');
      }
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize Google Identity Services script
  useEffect(() => {
    const google = (window as any).google;
    if (google?.accounts?.id) {
      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '35123456789-mockclientid.apps.googleusercontent.com',
        callback: handleGoogleCredentialResponse,
      });

      google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { theme: 'outline', size: 'large', width: 380 }
      );
    }
  }, [activeTab]);

  const handleFinalizeGoogleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload: any = {
      credential: googleCredential,
      role: googleSetupRole,
      phone: googleSetupPhone,
    };

    if (googleSetupRole === 'PATIENT') {
      payload.bloodGroup = googleSetupBlood;
      payload.allergies = googleSetupAllergies;
      payload.emergencyContactName = googleSetupContactName;
      payload.emergencyContactPhone = googleSetupContactPhone;
      payload.medicalNotes = googleSetupNotes;
    } else {
      payload.vehicleNumber = googleSetupVehicle;
      payload.ambulanceType = googleSetupAmbType;
    }

    try {
      const data = await apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowGoogleSetup(false);
      login(data.token, data.user);
      if (data.user.role === 'PATIENT') navigate('/patient');
      else navigate('/driver');
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  // Mock Developer Quick Login
  const handleMockGoogleLogin = () => {
    if (activeTab === 'PATIENT') {
      setEmail('patient.john@gmail.com');
      setPassword('password123');
    } else {
      setEmail('driver.mike@lifelink.com');
      setPassword('password123');
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 overflow-hidden font-sans transition-colors">
      {/* Floating Theme Toggle */}
      <div className="absolute top-6 right-6 z-30">
        <ThemeToggle />
      </div>

      {/* Background glowing decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-500/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-650 dark:from-white dark:via-slate-200 dark:to-rose-400 bg-clip-text text-transparent">
            LifeLink
          </span>
        </div>
        <h2 className="mt-6 text-center text-xl font-medium text-slate-500 dark:text-slate-400">
          Emergency Medical Dispatch Platform
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white dark:bg-slate-950/40 backdrop-blur-xl p-8 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl relative transition-colors">
          {/* Role selector Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-950/60 p-1.5 rounded-xl mb-6 border border-slate-200 dark:border-slate-800 transition-colors">
            <button
              onClick={() => {
                setActiveTab('PATIENT');
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer ${
                activeTab === 'PATIENT'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4" />
              Patient Portal
            </button>
            <button
              onClick={() => {
                setActiveTab('DRIVER');
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer ${
                activeTab === 'DRIVER'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Truck className="w-4 h-4" />
              Ambulance Driver
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-455 text-sm space-y-2">
                <div>{error}</div>
                {error.toLowerCase().includes('administrative') && (
                  <div className="flex gap-2 pt-2 border-t border-rose-500/20">
                    <button
                      type="button"
                      onClick={() => navigate('/admin/login')}
                      className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Hospital Admin Login →
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/super-admin/login')}
                      className="flex-1 py-1.5 px-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Super Admin Login →
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Email Address
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
                  placeholder="name@example.com"
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Password
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
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-605 focus:outline-none focus:border-rose-500 transition-colors text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-white shadow-lg transition-all duration-300 cursor-pointer disabled:opacity-70 ${
                activeTab === 'PATIENT'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/10'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/10'
              }`}
            >
              {loading ? (
                <HeartbeatLoader size="small" strokeColor="#ffffff" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Social login option */}
          <div className="mt-5 border-t border-slate-200 dark:border-slate-800 pt-5 flex flex-col items-center gap-3">
            <div id="google-signin-button" className="w-full flex justify-center"></div>
            
            <button
              type="button"
              onClick={handleMockGoogleLogin}
              className="w-full text-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-400 text-3xs font-semibold uppercase tracking-widest mt-2 transition-colors cursor-pointer"
            >
              Autofill Seed Credentials (Developer Mode)
            </button>
          </div>

          <div className="mt-6 text-center text-xs">
            <span className="text-slate-500">New to LifeLink? </span>
            <Link to="/register" className="text-rose-500 hover:text-rose-400 font-semibold transition-colors">
              Create an account
            </Link>
          </div>

          {/* Administrative Gateways */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800/80 space-y-2 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Staff & Administrative Portals
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate('/admin/login')}
                className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 rounded-xl text-2xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🏥 Hospital Staff Portal</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/super-admin/login')}
                className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 hover:border-rose-500/40 text-rose-600 dark:text-rose-400 rounded-xl text-2xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🛡️ Super Admin Vault</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Google Setup Form Modal */}
      {showGoogleSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full p-8 rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowGoogleSetup(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>

            <div className="flex items-center gap-2.5 mb-6 text-rose-500">
              <Activity className="w-6 h-6 animate-pulse" />
              <span className="text-xl font-bold tracking-tight">Complete Google Signup</span>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              This is your first time signing in with this Google Account. Please choose your portal role and fill in the missing details.
            </p>

            <form onSubmit={handleFinalizeGoogleSetup} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                  Choose Role Portal
                </label>
                <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-850">
                  <button
                    type="button"
                    onClick={() => setGoogleSetupRole('PATIENT')}
                    className={`flex-1 py-2 text-2xs font-bold rounded-lg transition-all ${
                      googleSetupRole === 'PATIENT' ? 'bg-rose-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Patient Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoogleSetupRole('DRIVER')}
                    className={`flex-1 py-2 text-2xs font-bold rounded-lg transition-all ${
                      googleSetupRole === 'DRIVER' ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Ambulance Driver
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={googleSetupPhone}
                    onChange={(e) => setGoogleSetupPhone(e.target.value)}
                    placeholder="e.g. +15550199"
                    className="block w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {googleSetupRole === 'PATIENT' ? (
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                        Blood Type
                      </label>
                      <select
                        value={googleSetupBlood}
                        onChange={(e) => setGoogleSetupBlood(e.target.value)}
                        className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-300 text-xs focus:outline-none"
                      >
                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((type) => (
                          <option key={type} value={type} className="bg-slate-900 text-slate-200">{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                        Allergies
                      </label>
                      <input
                        type="text"
                        value={googleSetupAllergies}
                        onChange={(e) => setGoogleSetupAllergies(e.target.value)}
                        placeholder="Penicillin, etc."
                        className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                        Emergency Contact Name
                      </label>
                      <input
                        type="text"
                        required
                        value={googleSetupContactName}
                        onChange={(e) => setGoogleSetupContactName(e.target.value)}
                        placeholder="Jane Doe"
                        className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                        Emergency Contact Phone
                      </label>
                      <input
                        type="tel"
                        required
                        value={googleSetupContactPhone}
                        onChange={(e) => setGoogleSetupContactPhone(e.target.value)}
                        placeholder="+15550299"
                        className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                      Critical Medical Notes
                    </label>
                    <textarea
                      rows={2}
                      value={googleSetupNotes}
                      onChange={(e) => setGoogleSetupNotes(e.target.value)}
                      placeholder="Takes insulin, etc."
                      className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                        Vehicle Plate Number
                      </label>
                      <input
                        type="text"
                        required
                        value={googleSetupVehicle}
                        onChange={(e) => setGoogleSetupVehicle(e.target.value)}
                        placeholder="AMB-909"
                        className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                        Ambulance Level
                      </label>
                      <select
                        value={googleSetupAmbType}
                        onChange={(e) => setGoogleSetupAmbType(e.target.value)}
                        className="block w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-300 text-xs focus:outline-none"
                      >
                        <option value="BASIC_LIFE_SUPPORT" className="bg-slate-900 text-slate-200">Basic Life Support</option>
                        <option value="ADVANCED_LIFE_SUPPORT" className="bg-slate-900 text-slate-200">Advanced Life Support</option>
                        <option value="OXYGEN_SUPPORT" className="bg-slate-900 text-slate-200">Oxygen Support</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className={`w-full py-3 mt-4 text-xs font-bold text-white rounded-xl shadow-lg transition-all ${
                  googleSetupRole === 'PATIENT' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                Complete Profile & Launch App
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
