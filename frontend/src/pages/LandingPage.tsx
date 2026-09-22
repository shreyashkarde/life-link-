import React from 'react';
import { Link } from 'react-router-dom';
import {
  HeartPulse,
  Truck,
  Calendar,
  ShieldCheck,
  Zap,
  ArrowRight,
  Clock,
  Sparkles,
  PhoneCall,
  Activity,
  Award,
} from 'lucide-react';
import { SOSAlertButton } from '../components/patient/SOSAlertButton';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-surface-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-blue-500 flex items-center justify-center text-white shadow-soft">
              <HeartPulse className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-surface-900">
                LifeLink<span className="text-blue-600">.</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Smart Dispatch 24/7
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-xs font-bold text-surface-700 hover:text-blue-600 hover:bg-surface-50 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-soft"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Next-Gen Smart Emergency Healthcare Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-surface-900 leading-[1.1]">
            Instant Ambulances & Verified Doctors, <span className="text-blue-600">When Every Second Counts</span>.
          </h1>

          <p className="text-base sm:text-lg text-surface-600 leading-relaxed max-w-2xl mx-auto">
            Real-time GPS ambulance dispatch with sub-5-minute response times, live vehicle tracking, 1-click SOS escalation, and top multi-specialty doctor appointments.
          </p>

          {/* Quick CTA and SOS Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <SOSAlertButton />
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-surface-900 hover:bg-surface-800 text-white font-bold text-sm transition-all shadow-card"
            >
              <span>Explore 5 Role Dashboards</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="bg-white p-6 rounded-3xl border border-surface-100 shadow-card hover:shadow-soft transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-surface-900 mb-2">Uber-Like Ambulance Dispatch</h3>
            <p className="text-xs text-surface-500 leading-relaxed">
              Find nearest ALS, BLS, and Oxygen ambulances in real time with turn-by-turn live GPS tracking on interactive maps.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-surface-100 shadow-card hover:shadow-soft transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-surface-900 mb-2">Doctor Consultations & Slots</h3>
            <p className="text-xs text-surface-500 leading-relaxed">
              Book verified specialists across Cardiology, Neurology, Orthopedics, and General Medicine with instant slot confirmation.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-surface-100 shadow-card hover:shadow-soft transition-all">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-surface-900 mb-2">1-Click Emergency SOS</h3>
            <p className="text-xs text-surface-500 leading-relaxed">
              One-click instant dispatch that auto-locates your coordinates, alerts nearby trauma centers, and dispatches the fastest unit.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-100 bg-white py-6 px-6 text-center text-xs text-surface-500">
        <p>© 2026 LifeLink Emergency & Healthcare Dispatch Network. All rights reserved.</p>
      </footer>
    </div>
  );
};
