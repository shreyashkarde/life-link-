import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assets, specialityData } from '../assets/assets';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSpeciality, setSelectedSpeciality] = useState('');

  const handleSearchDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSpeciality) {
      navigate(`/doctors/${selectedSpeciality}`);
    } else {
      navigate('/doctors');
    }
    window.scrollTo(0, 0);
  };

  return (
    <div className="space-y-6">
      {/* Main Hero Card Container */}
      <div className="relative rounded-[32px] sm:rounded-[40px] bg-gradient-to-br from-[#0f172a] via-[#1e2e6e] to-[#253275] text-white overflow-hidden shadow-2xl border border-blue-400/20 px-6 sm:px-10 lg:px-16 pt-10 pb-8 sm:pb-12">
        {/* Ambient Glowing Orbs */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
          {/* Left Column: Headline, Social Proof, and Actions */}
          <div className="lg:w-7/12 space-y-5 text-center lg:text-left">
            {/* Live Status Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-100 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>24/7 Verified Healthcare • Priority Ambulance Telemetry Active</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15]">
              The Heart of Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-emerald-300">
                Healthcare
              </span>
              .
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-base text-blue-100/90 max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
              Connect with top board-certified physicians, schedule instant consultations, and request 1-tap emergency ambulance dispatch in real-time.
            </p>

            {/* Interactive Search Bar */}
            <form
              onSubmit={handleSearchDoctor}
              className="bg-white/10 backdrop-blur-xl p-2 sm:p-2.5 rounded-2xl border border-white/20 shadow-xl max-w-lg mx-auto lg:mx-0 flex flex-col sm:flex-row items-center gap-2"
            >
              <div className="flex-1 w-full flex items-center gap-2 px-3 py-2 bg-white/90 rounded-xl text-gray-800">
                <span className="text-base text-blue-600">🩺</span>
                <select
                  value={selectedSpeciality}
                  onChange={(e) => setSelectedSpeciality(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-medium focus:outline-none cursor-pointer text-gray-700"
                >
                  <option value="">All Medical Specialities</option>
                  {specialityData.map((s, idx) => (
                    <option key={idx} value={s.speciality}>
                      {s.speciality}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                Find Doctors →
              </button>
            </form>

            {/* Social Proof & Doctor Avatars */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <div className="flex -space-x-2.5 overflow-hidden">
                {assets.group_profiles.map((src, i) => (
                  <img
                    key={i}
                    className="inline-block h-9 w-9 rounded-full ring-2 ring-white/80 object-cover shadow-sm"
                    src={src}
                    alt="Happy Patient"
                  />
                ))}
              </div>
              <div className="text-xs text-blue-100 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1 text-amber-300 font-bold">
                  <span>★★★★★</span>
                  <span className="text-white text-[11px] ml-1">4.9/5 Rating</span>
                </div>
                <p className="text-[11px] text-blue-200">Trusted by over 50,000+ satisfied families</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <a
                href="#speciality"
                className="px-6 py-3 bg-white text-[#1e2e6e] hover:bg-blue-50 rounded-full font-bold text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Book Appointment</span>
                <span className="text-primary font-black">→</span>
              </a>

              <button
                onClick={() => {
                  navigate('/features');
                  window.scrollTo(0, 0);
                }}
                className="px-5 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white rounded-full font-bold text-xs sm:text-sm border border-red-400/40 backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
                <span>🚨 Priority Ambulance Telemetry</span>
              </button>
            </div>
          </div>

          {/* Right Column: Hero Visual with Dynamic Floating Cards */}
          <div className="lg:w-5/12 relative flex items-center justify-center">
            {/* Main Visual Image */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 max-w-sm sm:max-w-md w-full bg-slate-900/40">
              <img
                src={assets.header_img}
                alt="Medical Specialist Team"
                className="w-full h-auto object-cover filter contrast-[1.05]"
              />

              {/* Gradient Bottom Shadow */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-transparent to-transparent"></div>

              {/* Floating Live Telemetry Badge 1: Ambulance ETA */}
              <div className="absolute bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur-xl p-3.5 rounded-2xl border border-white/20 shadow-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/90 text-white flex items-center justify-center text-lg font-bold shadow-md">
                    🚑
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">Unit MH-01-EQ-1108</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    </div>
                    <p className="text-[10px] text-gray-300">ALS Paramedic Onboard • Bandra West</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                    ETA: 3 MINS
                  </span>
                </div>
              </div>
            </div>

            {/* Floating Top Badge 2: Certified Verified Doctors */}
            <div className="absolute -top-4 -left-4 sm:-left-6 bg-white/95 backdrop-blur-md text-gray-900 p-3 rounded-2xl border border-blue-100 shadow-xl hidden sm:flex items-center gap-2.5 animate-bounce-short">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                ✓
              </div>
              <div className="text-left leading-tight pr-2">
                <p className="text-xs font-bold text-gray-900">100% Certified</p>
                <p className="text-[10px] text-gray-500">Licensed Specialists</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic 4-Point Live Stats Counter Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-1">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 hover:border-blue-200 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
            🩺
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">100+</p>
            <p className="text-xs text-gray-500 font-medium">Certified Doctors</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 hover:border-blue-200 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
            🏥
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">15+</p>
            <p className="text-xs text-gray-500 font-medium">Trauma Hospitals</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 hover:border-blue-200 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold">
            ⚡
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">&lt; 5 mins</p>
            <p className="text-xs text-gray-500 font-medium">Emergency Response</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 hover:border-blue-200 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-xl font-bold">
            ⭐
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">99.4%</p>
            <p className="text-xs text-gray-500 font-medium">Patient Satisfaction</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
