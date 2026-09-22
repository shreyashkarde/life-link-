import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Navigation, Radio, Locate } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

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
  const { addToast } = useToast();

  const [mode, setMode] = useState<'IDLE' | 'SIMULATE' | 'DEVICE_GPS'>('IDLE');
  const [coords, setCoords] = useState({ lat: currentLat, lng: currentLng });
  const [speed, setSpeed] = useState(0);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    setCoords({ lat: currentLat, lng: currentLng });
  }, [currentLat, currentLng]);

  // 1. Driving Simulation Mode
  useEffect(() => {
    let interval: any = null;

    if (mode === 'SIMULATE') {
      interval = setInterval(() => {
        setCoords((prev) => {
          // Incremental delta simulating road movement
          const deltaLat = (Math.random() - 0.46) * 0.0012;
          const deltaLng = (Math.random() - 0.46) * 0.0012;
          const newLat = prev.lat + deltaLat;
          const newLng = prev.lng + deltaLng;
          const currentSpeed = Math.floor(38 + Math.random() * 16);
          setSpeed(currentSpeed);

          // Emit live location over Socket.io
          if (socket && (user?.id || user?._id)) {
            socket.emit('driver:locationUpdate', {
              driverId: user.id || user._id,
              bookingId,
              lat: newLat,
              lng: newLng,
              heading: 45,
              speed: currentSpeed,
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
  }, [mode, socket, user, bookingId, onLocationUpdate]);

  // 2. Real Physical Device GPS Mode (HTML5 Geolocation)
  useEffect(() => {
    if (mode === 'DEVICE_GPS') {
      if (!navigator.geolocation) {
        addToast('error', 'Geolocation is not supported by your browser');
        setMode('IDLE');
        return;
      }

      addToast('success', 'Real Device GPS Activated. Tracking live movement...');

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const devSpeed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 35;
          const devHeading = pos.coords.heading || 0;

          setCoords({ lat, lng });
          setSpeed(devSpeed);

          if (socket && (user?.id || user?._id)) {
            socket.emit('driver:locationUpdate', {
              driverId: user.id || user._id,
              bookingId,
              lat,
              lng,
              heading: devHeading,
              speed: devSpeed,
            });
          }

          if (onLocationUpdate) {
            onLocationUpdate(lat, lng);
          }
        },
        (err) => {
          console.warn('Device GPS tracking error:', err);
          addToast('error', 'Device GPS permission denied or lost');
          setMode('IDLE');
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
      );
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (mode === 'IDLE') setSpeed(0);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [mode, socket, user, bookingId, onLocationUpdate]);

  return (
    <div className="glass-card rounded-3xl p-5 border border-surface-200/80 shadow-luxury space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-2xl transition-all ${
              mode !== 'IDLE'
                ? 'bg-emerald-600 text-white shadow-glow-emerald animate-pulse'
                : 'bg-blue-600 text-white'
            }`}
          >
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-surface-900 tracking-tight">
                {mode === 'DEVICE_GPS'
                  ? 'Real-World Device GPS Active'
                  : mode === 'SIMULATE'
                  ? 'Simulated Highway Movement Active'
                  : 'Ambulance Live Location Transmitter'}
              </h4>
              {mode !== 'IDLE' && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {speed} km/h
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-surface-500 mt-0.5">
              Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng.toFixed(5)} • Socket.io Stream Active
            </p>
          </div>
        </div>

        {/* Mode Actions */}
        <div className="flex items-center gap-2">
          {/* Real Device GPS Toggle */}
          <button
            onClick={() => setMode(mode === 'DEVICE_GPS' ? 'IDLE' : 'DEVICE_GPS')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'DEVICE_GPS'
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-glow-rose'
                : 'bg-surface-100 hover:bg-surface-200 text-surface-700 border border-surface-200'
            }`}
          >
            <Locate className="w-3.5 h-3.5" />
            <span>{mode === 'DEVICE_GPS' ? 'Stop Device GPS' : 'Real Phone GPS'}</span>
          </button>

          {/* Simulator Toggle */}
          <button
            onClick={() => setMode(mode === 'SIMULATE' ? 'IDLE' : 'SIMULATE')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'SIMULATE'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-glow-blue'
            }`}
          >
            {mode === 'SIMULATE' ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Sim</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Simulate Drive</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
