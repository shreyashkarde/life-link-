import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, Navigation } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

interface GPSSimulatorProps {
  currentLat: number;
  currentLng: number;
  bookingId?: string;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

export const GPSSimulator: React.FC<GPSSimulatorProps> = ({
  currentLat,
  currentLng,
  bookingId,
  onLocationUpdate,
}) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [isSimulating, setIsSimulating] = useState(false);
  const [coords, setCoords] = useState({ lat: currentLat, lng: currentLng });

  useEffect(() => {
    setCoords({ lat: currentLat, lng: currentLng });
  }, [currentLat, currentLng]);

  useEffect(() => {
    let interval: any = null;

    if (isSimulating) {
      interval = setInterval(() => {
        setCoords((prev) => {
          // Slight incremental delta simulating driving along city grid
          const deltaLat = (Math.random() - 0.48) * 0.001;
          const deltaLng = (Math.random() - 0.48) * 0.001;
          const newLat = prev.lat + deltaLat;
          const newLng = prev.lng + deltaLng;

          // Emit over Socket.io
          if (socket && (user?.id || user?._id)) {
            socket.emit('driver:locationUpdate', {
              driverId: user.id || user._id,
              bookingId,
              lat: newLat,
              lng: newLng,
              heading: 45,
              speed: 42,
            });
          }

          if (onLocationUpdate) {
            onLocationUpdate(newLat, newLng);
          }

          return { lat: newLat, lng: newLng };
        });
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulating, socket, user, bookingId, onLocationUpdate]);

  return (
    <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${isSimulating ? 'bg-emerald-600 text-white animate-pulse' : 'bg-blue-600 text-white'}`}>
          <Navigation className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-surface-900">
            {isSimulating ? 'Live GPS Transmitter Active' : 'Simulate GPS Driving Motion'}
          </h4>
          <p className="text-[11px] text-surface-500 mt-0.5">
            Lat: {coords.lat.toFixed(4)}, Lng: {coords.lng.toFixed(4)} (Updates every 3s)
          </p>
        </div>
      </div>

      <button
        onClick={() => setIsSimulating(!isSimulating)}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
          isSimulating
            ? 'bg-amber-600 hover:bg-amber-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isSimulating ? (
          <>
            <Pause className="w-3.5 h-3.5" />
            <span>Pause GPS</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5" />
            <span>Start Drive GPS</span>
          </>
        )}
      </button>
    </div>
  );
};
