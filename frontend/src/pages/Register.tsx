import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, User, Truck, Mail, Lock, Phone, Heart, ShieldAlert, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { HeartbeatLoader } from '../components/ui/HeartbeatLoader';

export const Register: React.FC = () => {
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

  const [activeRole, setActiveRole] = useState<'PATIENT' | 'DRIVER'>('PATIENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Patient profile details
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  // Driver details
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [ambulanceType, setAmbulanceType] = useState('BASIC_LIFE_SUPPORT');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Google OAuth setup states
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);
  const [showGoogleSetup, setShowGoogleSetup] = useState(false);
  const [googleSetupRole, setGoogleSetupRole] = useState<'PATIENT' | 'DRIVER'>('PATIENT');
  const [googleSetupPhone, setGoogleSetupPhone] = useState('');
  
  // Google Patient profile details
  const [googleSetupBlood, setGoogleSetupBlood] = useState('O+');
  const [googleSetupAllergies, setGoogleSetupAllergies] = useState('');
  const [googleSetupContactName, setGoogleSetupContactName] = useState('');
  const [googleSetupContactPhone, setGoogleSetupContactPhone] = useState('');
  const [googleSetupNotes, setGoogleSetupNotes] = useState('');

  // Google Driver details
  const [googleSetupVehicle, setGoogleSetupVehicle] = useState('');
  const [googleSetupAmbType, setGoogleSetupAmbType] = useState('BASIC_LIFE_SUPPORT');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload: any = {
      email,
      password,
      name,
      phone,
      role: activeRole,
    };

    if (activeRole === 'PATIENT') {
      payload.bloodGroup = bloodGroup;
      payload.allergies = allergies;
      payload.emergencyContactName = emergencyContactName;
      payload.emergencyContactPhone = emergencyContactPhone;
      payload.medicalNotes = medicalNotes;
    } else {
      payload.vehicleNumber = vehicleNumber;
      payload.ambulanceType = ambulanceType;
    }

    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      login(data.token, data.user);
      if (activeRole === 'PATIENT') {
        navigate('/patient');
      } else {
        navigate('/driver');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleCredentialResponse = async (response: any) => {
    const idToken = response.credential;
    setGoogleCredential(idToken);
    setError('');

    try {
      setLoading(true);
      const data = await apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential: idToken, role: activeRole }),
      });

      if (data.isNewUser) {
        setGoogleSetupRole(activeRole);
        setShowGoogleSetup(true);
      } else {
        login(data.token, data.user);
        if (data.user.role === 'PATIENT') navigate('/patient');
        else navigate('/driver');
      }
    } catch (err: any) {
      setError(err.message || 'Google registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize GSI Button
  useEffect(() => {
    const google = (window as any).google;
    if (google?.accounts?.id) {
      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '35123456789-mockclientid.apps.googleusercontent.com',
        callback: handleGoogleCredentialResponse,
      });

      google.accounts.id.renderButton(
        document.getElementById('google-signup-button'),
        { theme: 'outline', size: 'large', width: 450 }
      );
    }
  }, [activeRole]);

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

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 overflow-y-auto font-sans transition-colors">
      {/* Floating Theme Toggle */}
      <div className="absolute top-6 right-6 z-30">
        <ThemeToggle />
      </div>

      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-500/5 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl z-10 px-4">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 to-rose-500 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Create LifeLink Account</span>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl z-10 px-4">
        <div className="bg-white dark:bg-slate-955/40 backdrop-blur-xl p-8 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl transition-colors">
          {/* Role selector Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-950/60 p-1 rounded-xl mb-6 border border-slate-200 dark:border-slate-800 transition-colors">
            <button
              onClick={() => setActiveRole('PATIENT')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all duration-300 cursor-pointer ${
                activeRole === 'PATIENT'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Patient Registration
            </button>
            <button
              onClick={() => setActiveRole('DRIVER')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all duration-300 cursor-pointer ${
                activeRole === 'DRIVER'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Ambulance Driver
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {error}
              </div>
            )}

            {/* Core credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-colors text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +15550199"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-colors text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-colors text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-colors text-xs"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-800" />

            {/* Role specific inputs */}
            {activeRole === 'PATIENT' ? (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-rose-450 tracking-wide uppercase">Medical & Emergency Profile</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Blood Type
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Heart className="w-4 h-4" />
                      </div>
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="block w-full pl-10 pr-4 py-2.5 bg-slate-950/45 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-rose-500 text-xs"
                      >
                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((type) => (
                          <option key={type} value={type} className="bg-slate-900 text-slate-200">{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Allergies
                    </label>
                    <input
                      type="text"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="e.g. Penicillin, Peanuts (or 'None')"
                      className="block w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-colors text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      required
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="block w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-colors text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Emergency Contact Phone
                    </label>
                    <input
                      type="tel"
                      required
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="e.g. +15550299"
                      className="block w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-colors text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Critical Medical Notes
                  </label>
                  <textarea
                    rows={2}
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    placeholder="e.g. Diabetic Type I, takes insulin. High blood pressure."
                    className="block w-full px-4 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-colors text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-blue-400 tracking-wide uppercase">Ambulance Vehicle & Equipment Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Vehicle License Plate / ID
                    </label>
                    <input
                      type="text"
                      required
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      placeholder="e.g. AMB-707"
                      className="block w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Ambulance Support Level
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <select
                        value={ambulanceType}
                        onChange={(e) => setAmbulanceType(e.target.value)}
                        className="block w-full pl-10 pr-4 py-2.5 bg-slate-950/45 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-blue-500 text-xs"
                      >
                        <option value="BASIC_LIFE_SUPPORT" className="bg-slate-900 text-slate-200">Basic Life Support (BLS)</option>
                        <option value="ADVANCED_LIFE_SUPPORT" className="bg-slate-900 text-slate-200">Advanced Life Support (ALS)</option>
                        <option value="OXYGEN_SUPPORT" className="bg-slate-900 text-slate-200">Oxygen Support Vehicle</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-all duration-300 cursor-pointer disabled:opacity-70 ${
                activeRole === 'PATIENT'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/10'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/10'
              }`}
            >
              {loading ? (
                <HeartbeatLoader size="small" strokeColor="#ffffff" />
              ) : (
                'Complete Registration & Sign In'
              )}
            </button>
          </form>

          {/* Google Sign-Up Action */}
          <div className="mt-5 border-t border-slate-200 dark:border-slate-800 pt-5 flex flex-col items-center">
            <div id="google-signup-button" className="w-full flex justify-center"></div>
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
              <span className="text-xl font-bold tracking-tight">Complete Google Registration</span>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Complete your profile setup by submitting phone and role-specific details.
            </p>

            <form onSubmit={handleFinalizeGoogleSetup} className="space-y-4">
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

export default Register;
