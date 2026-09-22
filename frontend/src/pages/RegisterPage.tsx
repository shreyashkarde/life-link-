import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  HeartPulse,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  ArrowRight,
  Truck,
  Activity,
} from 'lucide-react';
import { UserRole } from '../types';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('PATIENT');
  const [specialization, setSpecialization] = useState('General Medicine');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [ambulanceType, setAmbulanceType] = useState('BASIC');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await register({
        name,
        email,
        password,
        phone,
        role,
        specialization: role === 'DOCTOR' ? specialization : undefined,
        vehicleNumber: role === 'DRIVER' ? vehicleNumber : undefined,
        ambulanceType: role === 'DRIVER' ? ambulanceType : undefined,
      });

      addToast('success', `Account created successfully! Welcome, ${user.name}`);

      if (user.role === 'PATIENT') navigate('/patient');
      else if (user.role === 'DOCTOR') navigate('/doctor');
      else if (user.role === 'DRIVER') navigate('/driver');
      else if (user.role === 'ADMIN_HOSPITAL') navigate('/admin/hospital');
      else if (user.role === 'SUPER_ADMIN') navigate('/admin/super');
      else navigate('/patient');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Registration failed');
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
        <h2 className="text-2xl font-black text-surface-900 tracking-tight">Create your LifeLink Account</h2>
        <p className="text-xs text-surface-500 mt-1">Join the smart healthcare and ambulance dispatch network</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-surface-100 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection Tabs */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1.5">Select Account Role</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { role: 'PATIENT', label: 'Patient', icon: HeartPulse },
                  { role: 'DOCTOR', label: 'Doctor', icon: Activity },
                  { role: 'DRIVER', label: 'Ambulance Driver', icon: Truck },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => setRole(item.role as UserRole)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                        role === item.role
                          ? 'bg-blue-600 text-white border-blue-600 shadow-soft'
                          : 'bg-surface-50 text-surface-700 border-surface-200 hover:bg-white hover:border-blue-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold text-surface-700 mb-1">Full Name</label>
              <div className="relative">
                <input
                  id="reg-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Aryan Khan / Ramesh Kumar"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  required
                />
                <UserIcon className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-email" className="block text-xs font-semibold text-surface-700 mb-1">Email Address</label>
                <div className="relative">
                  <input
                    id="reg-email"
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
                <label htmlFor="reg-phone" className="block text-xs font-semibold text-surface-700 mb-1">Phone Number</label>
                <div className="relative">
                  <input
                    id="reg-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98200 00000"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    required
                  />
                  <Phone className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold text-surface-700 mb-1">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  minLength={6}
                  required
                />
                <Lock className="w-4 h-4 text-surface-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Doctor specific fields */}
            {role === 'DOCTOR' && (
              <div>
                <label htmlFor="reg-specialization" className="block text-xs font-semibold text-surface-700 mb-1">Medical Specialization</label>
                <select
                  id="reg-specialization"
                  name="specialization"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="Cardiology">Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="General Medicine">General Medicine</option>
                  <option value="Emergency & Trauma">Emergency & Trauma</option>
                </select>
              </div>
            )}

            {/* Driver specific fields */}
            {role === 'DRIVER' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-vehicle" className="block text-xs font-semibold text-surface-700 mb-1">Vehicle Plate No.</label>
                  <input
                    id="reg-vehicle"
                    name="vehicleNumber"
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="MH01AB1234"
                    className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="reg-ambulance-type" className="block text-xs font-semibold text-surface-700 mb-1">Ambulance Type</label>
                  <select
                    id="reg-ambulance-type"
                    name="ambulanceType"
                    value={ambulanceType}
                    onChange={(e) => setAmbulanceType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value="BASIC">Basic Support (BLS)</option>
                    <option value="ADVANCED_ALS">Advanced Life Support (ALS)</option>
                    <option value="OXYGEN_BLS">Oxygen BLS</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-soft disabled:opacity-50"
            >
              <span>{loading ? 'Registering...' : 'Complete Registration'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-xs text-surface-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-blue-600 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
