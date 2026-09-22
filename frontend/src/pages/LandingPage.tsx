import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  Truck,
  Calendar,
  ShieldCheck,
  Zap,
  ArrowRight,
  Clock,
  Sparkles,
  Activity,
  Award,
  Radio,
  Navigation,
  CheckCircle2,
  Building2,
  Stethoscope,
  PhoneCall,
  UserCheck,
  ChevronRight,
  Gauge,
  MapPin,
  Flame,
} from 'lucide-react';
import { SOSAlertButton } from '../components/patient/SOSAlertButton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const LandingPage: React.FC = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Simulated live telemetry counters
  const [speed, setSpeed] = useState(52);
  const [heartRate, setHeartRate] = useState(76);
  const [etaSeconds, setEtaSeconds] = useState(218);

  useEffect(() => {
    const timer = setInterval(() => {
      setSpeed(Math.floor(48 + Math.random() * 12));
      setHeartRate(Math.floor(72 + Math.random() * 8));
      setEtaSeconds((prev) => (prev > 30 ? prev - 1 : 218));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const formatEta = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const handleQuickDemoLogin = async (email: string, roleName: string, destination: string) => {
    try {
      addToast('info', `Logging into ${roleName} sandbox environment...`);
      await login({ email, password: 'password123' });
      navigate(destination);
    } catch (err: any) {
      addToast('error', 'Demo authentication failed. Please try standard sign in.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Executive Glass Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-surface-200/80 px-6 py-3.5 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-soft ring-2 ring-blue-600/20">
              <HeartPulse className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-surface-900">
                  LifeLink<span className="text-blue-600">.</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50/80 text-blue-700 border border-blue-200/80 text-[10px] font-extrabold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Code-Red Ready
                </span>
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-surface-600">
            <a href="#telemetry" className="hover:text-blue-600 transition-colors">Live Telemetry</a>
            <a href="#roles" className="hover:text-blue-600 transition-colors">5 Role Portals</a>
            <a href="#fleet" className="hover:text-blue-600 transition-colors">Ambulance Fleet</a>
            <a href="#network" className="hover:text-blue-600 transition-colors">Hospital Grid</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-xs font-bold text-surface-700 hover:text-blue-600 hover:bg-surface-100 transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-black transition-all shadow-glow-blue hover:shadow-blue-600/40"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Ambient Mesh Background */}
      <section className="relative overflow-hidden mesh-ambient-light pt-12 pb-20 px-6 border-b border-surface-200/60">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-blue-200/80 text-blue-700 text-xs font-black shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Next-Gen Autonomous Healthcare & Ambulance Dispatch</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-surface-900 leading-[1.08]">
                Instant Ambulances & World-Class Care. <br />
                <span className="gradient-text">When Every Second Counts.</span>
              </h1>

              <p className="text-base sm:text-lg text-surface-600 leading-relaxed max-w-2xl font-normal">
                High-speed emergency ambulance dispatch with sub-5-minute SLA, turn-by-turn live GPS telemetry, instant doctor consultation scheduling, and real-time hospital trauma bed synchronization.
              </p>

              {/* Action Hub */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <SOSAlertButton />
                <a
                  href="#roles"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-surface-900 hover:bg-surface-800 text-white font-bold text-xs transition-all shadow-luxury hover:-translate-y-0.5"
                >
                  <span>Explore 5 Role Portals</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              {/* Trust Badges Bar */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-surface-500 font-semibold border-t border-surface-200/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sub-5 Min Response</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>ISO 27001 & HIPAA Certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-600 animate-pulse" />
                  <span>Live GPS Radar Telemetry</span>
                </div>
              </div>
            </div>

            {/* Right: Live Interactive Telemetry HUD Card */}
            <div id="telemetry" className="lg:col-span-5">
              <div className="glass-card-dark rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden text-white group">
                {/* Ambient glow in background */}
                <div className="absolute -top-20 -right-20 w-56 h-56 bg-blue-600/30 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

                {/* Card Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <div>
                      <h4 className="text-xs font-black tracking-wide uppercase text-slate-300">
                        Dispatch Stream • Live Radar
                      </h4>
                      <p className="text-[11px] text-cyan-400 font-mono font-medium">UNIT #ALS-04 • CODE RED</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-extrabold font-mono">
                    ONLINE
                  </span>
                </div>

                {/* Simulated Radar Visual Window */}
                <div className="my-5 p-4 rounded-2xl bg-navy-950/80 border border-white/5 relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
                    <span className="flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-blue-400 animate-spin" style={{ animationDuration: '8s' }} />
                      En Route to Lilavati Trauma ICU
                    </span>
                    <span className="text-cyan-400 font-bold">ETA {formatEta(etaSeconds)}</span>
                  </div>

                  {/* Route progress bar */}
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mb-4">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full w-3/4 animate-pulse" />
                  </div>

                  {/* Key Live Telemetry Readouts */}
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-bold uppercase mb-1">
                        <Gauge className="w-3 h-3 text-blue-400" />
                        Speed
                      </div>
                      <p className="text-lg font-mono font-black text-white">{speed} <span className="text-xs text-slate-400">km/h</span></p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-bold uppercase mb-1">
                        <HeartPulse className="w-3 h-3 text-rose-400 animate-pulse" />
                        Pulse
                      </div>
                      <p className="text-lg font-mono font-black text-rose-400">{heartRate} <span className="text-xs text-slate-400">bpm</span></p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-bold uppercase mb-1">
                        <Radio className="w-3 h-3 text-emerald-400" />
                        SpO2
                      </div>
                      <p className="text-lg font-mono font-black text-emerald-400">98<span className="text-xs text-slate-400">%</span></p>
                    </div>
                  </div>
                </div>

                {/* Telemetry Footer */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    Bandra West, Mumbai (Geo-Locked)
                  </span>
                  <span className="text-slate-500 font-mono">Telemetry: 24.1 ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Network Metrics Strip */}
      <section className="py-10 px-6 bg-white border-b border-surface-200/80">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center p-4 rounded-2xl bg-surface-50 border border-surface-200/60">
            <p className="text-3xl sm:text-4xl font-black text-blue-600 font-mono tracking-tight">&lt; 4.5 Min</p>
            <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mt-1">Average Response Time</p>
          </div>
          <div className="text-center p-4 rounded-2xl bg-surface-50 border border-surface-200/60">
            <p className="text-3xl sm:text-4xl font-black text-surface-900 font-mono tracking-tight">180+</p>
            <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mt-1">Trauma Hospitals Linked</p>
          </div>
          <div className="text-center p-4 rounded-2xl bg-surface-50 border border-surface-200/60">
            <p className="text-3xl sm:text-4xl font-black text-surface-900 font-mono tracking-tight">1,250+</p>
            <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mt-1">Verified Doctors & Medics</p>
          </div>
          <div className="text-center p-4 rounded-2xl bg-surface-50 border border-surface-200/60">
            <p className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono tracking-tight">99.98%</p>
            <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mt-1">Network SLA Reliability</p>
          </div>
        </div>
      </section>

      {/* 5 Interactive Role Portals */}
      <section id="roles" className="py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-extrabold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-200/80">
            Engineered For Healthcare Ecosystems
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight">
            5 Role-Based Command Dashboards
          </h2>
          <p className="text-sm sm:text-base text-surface-500 leading-relaxed font-normal">
            Click on any role to immediately test the live application with simulated real-time data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Patient Card */}
          <div className="glass-card rounded-3xl p-6 border border-surface-200/80 shadow-luxury glass-card-hover flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-surface-900">Patient & Citizen Portal</h3>
              <p className="text-xs text-surface-500 mt-2 leading-relaxed">
                Book ambulances like Uber, view live turn-by-turn vehicle tracking on Leaflet maps, schedule doctor appointments, and trigger 1-click SOS.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-100 flex items-center justify-between">
              <span className="text-[11px] font-mono text-surface-400">patient@lifelink.com</span>
              <button
                onClick={() => handleQuickDemoLogin('patient@lifelink.com', 'Patient', '/patient')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <span>Launch Demo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Doctor Card */}
          <div className="glass-card rounded-3xl p-6 border border-surface-200/80 shadow-luxury glass-card-hover flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-surface-900">Doctor Clinical Suite</h3>
              <p className="text-xs text-surface-500 mt-2 leading-relaxed">
                Manage appointment queues, configure consultation time-slots, write digital prescriptions, and record diagnosis notes in real time.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-100 flex items-center justify-between">
              <span className="text-[11px] font-mono text-surface-400">doctor1@lifelink.com</span>
              <button
                onClick={() => handleQuickDemoLogin('doctor1@lifelink.com', 'Doctor', '/doctor')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <span>Launch Demo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Driver Card */}
          <div className="glass-card rounded-3xl p-6 border border-surface-200/80 shadow-luxury glass-card-hover flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200/80 text-cyan-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-surface-900">Ambulance Pilot Console</h3>
              <p className="text-xs text-surface-500 mt-2 leading-relaxed">
                Receive instant dispatch calls, simulate real-time GPS broadcasting via Socket.io, update ride phases, and navigate to patients.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-100 flex items-center justify-between">
              <span className="text-[11px] font-mono text-surface-400">driver1@lifelink.com</span>
              <button
                onClick={() => handleQuickDemoLogin('driver1@lifelink.com', 'Driver', '/driver')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <span>Launch Demo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Hospital Admin Card */}
          <div className="glass-card rounded-3xl p-6 border border-surface-200/80 shadow-luxury glass-card-hover flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-surface-900">Hospital Command Center</h3>
              <p className="text-xs text-surface-500 mt-2 leading-relaxed">
                Oversee hospital emergency beds, ICU availability, ambulance fleet allocations, and incoming emergency code-red cases.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-100 flex items-center justify-between">
              <span className="text-[11px] font-mono text-surface-400">admin@hospital.com</span>
              <button
                onClick={() => handleQuickDemoLogin('admin@hospital.com', 'Hospital Admin', '/admin/hospital')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <span>Launch Demo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Super Admin Card */}
          <div className="glass-card rounded-3xl p-6 border border-surface-200/80 shadow-luxury glass-card-hover flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-surface-900">Super Admin Global Nexus</h3>
              <p className="text-xs text-surface-500 mt-2 leading-relaxed">
                System-wide visibility over all users, hospital registrations, ambulance fleets, platform revenue, and live network health metrics.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-100 flex items-center justify-between">
              <span className="text-[11px] font-mono text-surface-400">superadmin@lifelink.com</span>
              <button
                onClick={() => handleQuickDemoLogin('superadmin@lifelink.com', 'Super Admin', '/admin/super')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <span>Launch Demo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Dedicated Live Ride Tracking Card */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-surface-900 to-navy-950 text-white border border-white/10 shadow-luxury flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-black text-white">Live Ride Tracking HUD</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed font-normal">
                Dedicated mission control view with real-time Leaflet GPS route simulation, turn-by-turn ETA recalculation, and direct driver call link.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-mono text-cyan-400">Real-time Socket.io</span>
              <Link
                to="/patient?tab=ambulance"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-surface-900 hover:bg-slate-100 text-xs font-bold transition-all shadow-xs"
              >
                <span>View Rides</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Fleet Capabilities Matrix */}
      <section id="fleet" className="py-16 px-6 bg-surface-50 border-t border-b border-surface-200/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-extrabold text-blue-600 uppercase tracking-widest">
              Emergency Fleet Specifications
            </span>
            <h2 className="text-3xl font-black text-surface-900 mt-1">Multi-Tier Ambulance Network</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-3xl border border-surface-200/80 shadow-luxury">
              <div className="text-3xl mb-3">🚑</div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-surface-900">Advanced Life Support (ALS)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">ICU Level</span>
              </div>
              <p className="text-xs text-surface-500 mt-2 leading-relaxed">
                Equipped with mobile ventilator, cardiac monitor, defibrillator, infusion pump, and registered emergency paramedic.
              </p>
              <div className="mt-4 pt-3 border-t border-surface-100 text-xs font-mono font-bold text-blue-600">
                Base Fare: ₹1,800 + ₹25/km
              </div>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-surface-200/80 shadow-luxury">
              <div className="text-3xl mb-3">🚐</div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-surface-900">Basic Life Support (BLS)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Standard</span>
              </div>
              <p className="text-xs text-surface-500 mt-2 leading-relaxed">
                Patient stretcher, primary first-aid equipment, basic vitals diagnostic kit, and certified emergency medical technician.
              </p>
              <div className="mt-4 pt-3 border-t border-surface-100 text-xs font-mono font-bold text-blue-600">
                Base Fare: ₹800 + ₹15/km
              </div>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-surface-200/80 shadow-luxury">
              <div className="text-3xl mb-3">🛟</div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-surface-900">Oxygen Carrier Ambulance</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">Respiratory</span>
              </div>
              <p className="text-xs text-surface-500 mt-2 leading-relaxed">
                Dual 10L medical oxygen cylinders, SpO2 real-time continuous pulse oximetry, and specialized respiratory transit support.
              </p>
              <div className="mt-4 pt-3 border-t border-surface-100 text-xs font-mono font-bold text-blue-600">
                Base Fare: ₹1,200 + ₹18/km
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hospital Network Partner Strip */}
      <section id="network" className="py-12 px-6 max-w-7xl mx-auto w-full text-center">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-6">
          Synchronized With Premier Hospital Trauma Centers
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-70">
          <span className="text-sm font-black text-surface-700 tracking-wider">APOLLO HOSPITALS</span>
          <span className="text-sm font-black text-surface-700 tracking-wider">FORTIS HEALTHCARE</span>
          <span className="text-sm font-black text-surface-700 tracking-wider">LILAVATI TRAUMA CENTER</span>
          <span className="text-sm font-black text-surface-700 tracking-wider">TATA MEMORIAL</span>
          <span className="text-sm font-black text-surface-700 tracking-wider">MAX HEALTHCARE</span>
        </div>
      </section>

      {/* Executive Dark Footer */}
      <footer className="border-t border-surface-200/80 bg-navy-950 text-slate-400 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-black text-lg">
              <HeartPulse className="w-5 h-5 text-blue-500" />
              <span>LifeLink.</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time emergency healthcare dispatch and smart doctor consultation network operating across metropolitan zones.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Emergency Hotline</h4>
            <p className="text-lg font-black text-rose-400 font-mono">108 / 112</p>
            <p className="text-[11px] text-slate-400 mt-1">Direct Priority National Emergency Dispatch</p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Platform Coverage</h4>
            <ul className="text-xs space-y-1.5 text-slate-400">
              <li>• Real-Time Leaflet GPS Tracking</li>
              <li>• 1-Click Code-Red SOS Dispatch</li>
              <li>• Verified Doctor Consultations</li>
              <li>• ER Bed & Trauma Telemetry</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Compliance & Security</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Protected by 256-bit SSL encryption, HIPAA health data compliance, and automated JWT token rotation.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© 2026 LifeLink Healthcare & Emergency Dispatch Network. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer">System Status</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
