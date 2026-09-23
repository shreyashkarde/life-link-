import React from 'react';
import { useNavigate } from 'react-router-dom';
import { assets } from '../assets/assets';

export const Banner: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative rounded-[32px] sm:rounded-[40px] bg-gradient-to-r from-[#121c42] via-[#1e2e6e] to-[#253275] text-white my-16 overflow-hidden shadow-2xl border border-blue-400/20 px-6 sm:px-12 lg:px-16 py-10 sm:py-16">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Left Column */}
        <div className="md:w-7/12 space-y-4 text-center md:text-left">
          <span className="px-3.5 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-blue-200 border border-white/20 uppercase tracking-wider">
            Smart Healthcare Platform
          </span>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Ready to Experience <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-sky-100 to-emerald-300">
              Smarter Healthcare?
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-blue-100/90 max-w-lg leading-relaxed">
            Join over 50,000+ patients who trust LifeLink for same-day doctor appointments, medical records, and 24/7 priority emergency ambulance dispatch.
          </p>

          {/* Trust Badges */}
          <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3 text-[11px] text-blue-200">
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/15">
              <span>🔒</span> 256-Bit Encrypted
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/15">
              <span>🩺</span> Verified Physicians
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/15">
              <span>🚑</span> 24/7 Priority Emergency
            </span>
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <button
              onClick={() => {
                navigate('/login');
                window.scrollTo(0, 0);
              }}
              className="px-8 py-3.5 bg-white text-[#1e2e6e] hover:bg-blue-50 rounded-full font-extrabold text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <span>Create Free Account</span>
              <span className="text-primary font-black">→</span>
            </button>

            <button
              onClick={() => {
                navigate('/doctors');
                window.scrollTo(0, 0);
              }}
              className="px-6 py-3.5 bg-white/15 hover:bg-white/25 text-white rounded-full font-bold text-xs sm:text-sm backdrop-blur-md border border-white/30 transition-all cursor-pointer"
            >
              Explore All 15 Doctors
            </button>
          </div>
        </div>

        {/* Right Column Visual */}
        <div className="md:w-5/12 relative flex items-center justify-center">
          <div className="relative max-w-xs sm:max-w-sm rounded-3xl overflow-hidden shadow-xl border-2 border-white/20 bg-slate-900/30">
            <img
              src={assets.appointment_img}
              alt="Medical Appointment Consultation"
              className="w-full h-auto object-contain filter contrast-[1.05]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banner;
