import React, { useState } from 'react';
import EmergencySOSModal from './EmergencySOSModal';

export const EmergencySOSButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Non-Invasive Emergency SOS Trigger */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-white hover:bg-rose-50 text-rose-600 border-2 border-rose-200 rounded-full font-black text-xs shadow-2xl hover:shadow-rose-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Emergency Ambulance Dispatch & Live Tracking"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
          <span className="text-base">🚑</span>
          <span className="font-extrabold tracking-tight">Emergency SOS</span>
        </button>
      </div>

      {/* Emergency Dispatch & Live Tracking Modal */}
      <EmergencySOSModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default EmergencySOSButton;
