import React, { useState, useEffect } from 'react';
import NotificationService from './NotificationService';

export const NotificationToast: React.FC = () => {
  const [activeToast, setActiveToast] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = NotificationService.subscribe((notif: any) => {
      setActiveToast(notif);
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    });

    return () => unsubscribe();
  }, []);

  if (!activeToast) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] animate-bounce-short">
      <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-blue-500/50 flex items-start gap-3 max-w-sm">
        <span className="text-2xl">🔔</span>
        <div className="flex-1">
          <p className="text-xs font-bold text-blue-400">{activeToast.title}</p>
          <p className="text-xs text-gray-200 mt-0.5">{activeToast.message}</p>
          <p className="text-[10px] text-gray-400 mt-1">{activeToast.timestamp}</p>
        </div>
        <button
          onClick={() => setActiveToast(null)}
          className="text-gray-400 hover:text-white text-xs font-bold"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
