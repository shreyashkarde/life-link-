import React, { useEffect, useState, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

export interface DriverTrackerProps {
  orderId: string;
  driverId?: string;
  driverName?: string;
  socketUrl?: string;
  autoStart?: boolean;
  onLocationSent?: (coords: { lat: number; lng: number; heading?: number; speed?: number }) => void;
  className?: string;
}

/**
 * 📱 DriverTracker Component
 * 
 * Driver-side GPS Telemetry Transmitter:
 * - Uses navigator.geolocation.watchPosition
 * - Sends location every 2–3 seconds via Socket.IO
 * - Emits event: "sendLocation"
 * - Payload: { orderId, driverId, lat, lng, heading, speed, timestamp }
 */
export const DriverTracker: React.FC<DriverTrackerProps> = ({
  orderId,
  driverId = 'driver_108',
  driverName = 'Rajesh Kumar (Driver)',
  socketUrl = window.location.origin,
  autoStart = true,
  onLocationSent,
  className = '',
}) => {
  const [isTracking, setIsTracking] = useState<boolean>(autoStart);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number; heading?: number; speed?: number }>({
    lat: 19.076,
    lng: 72.8777,
    heading: 0,
    speed: 0,
  });
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [packetsSent, setPacketsSent] = useState<number>(0);
  const [lastSentTime, setLastSentTime] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastEmitTimeRef = useRef<number>(0);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize Socket.IO connection
  useEffect(() => {
    if (!orderId) return;

    const socket: Socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('joinOrder', orderId);
      socket.emit('joinOrder', { orderId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.emit('leaveOrder', orderId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [orderId, socketUrl]);

  // 2. Transmit Location Packet
  const emitLocation = useCallback(
    (lat: number, lng: number, heading: number = 0, speed: number = 0) => {
      if (!socketRef.current || !orderId) return;

      const payload = {
        orderId,
        driverId,
        lat: Number(lat),
        lng: Number(lng),
        heading: Number(heading),
        speed: Number(speed),
        timestamp: Date.now(),
      };

      socketRef.current.emit('sendLocation', payload);
      setPacketsSent((prev) => prev + 1);
      setLastSentTime(new Date().toLocaleTimeString());

      if (onLocationSent) {
        onLocationSent({ lat, lng, heading, speed });
      }
    },
    [orderId, driverId, onLocationSent]
  );

  // 3. Watch Geolocation with navigator.geolocation
  useEffect(() => {
    if (!isTracking || isSimulating) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      console.warn('[DriverTracker] Geolocation not supported by browser');
      return;
    }

    const handleSuccess = (pos: GeolocationPosition) => {
      const now = Date.now();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const heading = pos.coords.heading || 0;
      const speed = pos.coords.speed ? pos.coords.speed * 3.6 : 30; // convert m/s to km/h

      setCoords({ lat, lng, heading, speed });
      setAccuracy(pos.coords.accuracy);

      // Throttled emit every 2-3 seconds (2500ms)
      if (now - lastEmitTimeRef.current >= 2200) {
        lastEmitTimeRef.current = now;
        emitLocation(lat, lng, heading, speed);
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      console.warn('[DriverTracker] GPS Watch Error:', err.message);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000,
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isTracking, isSimulating, emitLocation]);

  // 4. Desktop Testing GPS Route Simulator
  useEffect(() => {
    if (!isSimulating || !isTracking) {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      return;
    }

    let step = 0;
    const path = [
      { lat: 19.0522, lng: 72.8295, heading: 45 },
      { lat: 19.0545, lng: 72.8315, heading: 50 },
      { lat: 19.0578, lng: 72.8339, heading: 40 },
      { lat: 19.0612, lng: 72.8362, heading: 35 },
      { lat: 19.0645, lng: 72.8385, heading: 60 },
      { lat: 19.0678, lng: 72.8421, heading: 75 },
      { lat: 19.0712, lng: 72.8456, heading: 65 },
      { lat: 19.0745, lng: 72.8492, heading: 55 },
      { lat: 19.0768, lng: 72.8523, heading: 45 },
    ];

    simIntervalRef.current = setInterval(() => {
      const pt = path[step % path.length];
      step++;
      setCoords({ lat: pt.lat, lng: pt.lng, heading: pt.heading, speed: 38 });
      setAccuracy(5);
      emitLocation(pt.lat, pt.lng, pt.heading, 38);
    }, 2400);

    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, [isSimulating, isTracking, emitLocation]);

  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold border border-blue-100">
            📱
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Driver GPS Telemetry Streamer</h4>
            <p className="text-[11px] text-slate-500">
              Unit: <strong className="text-slate-800">{driverName}</strong> • Order #{orderId.slice(-6).toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}
            ></span>
            <span>{isConnected ? 'Socket Online' : 'Connecting'}</span>
          </span>
        </div>
      </div>

      {/* Real-time Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Latitude</p>
          <p className="font-mono font-bold text-slate-900 mt-0.5">{coords.lat.toFixed(5)}</p>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Longitude</p>
          <p className="font-mono font-bold text-slate-900 mt-0.5">{coords.lng.toFixed(5)}</p>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Speed / GPS Acc</p>
          <p className="font-bold text-blue-600 mt-0.5">
            {Math.round(coords.speed || 0)} km/h {accuracy ? `(±${Math.round(accuracy)}m)` : ''}
          </p>
        </div>

        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
          <p className="text-[10px] text-emerald-700 font-bold uppercase">Packets Streamed</p>
          <p className="font-mono font-bold text-emerald-900 mt-0.5">
            {packetsSent} {lastSentTime && <span className="text-[9px] text-emerald-600 font-normal">({lastSentTime})</span>}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTracking(!isTracking)}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
              isTracking
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <span>{isTracking ? '⏸ Stop Broadcasting' : '▶ Start Broadcasting GPS'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3 py-2 rounded-xl font-bold border transition-colors cursor-pointer ${
              isSimulating
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Simulate driving route for desktop testing"
          >
            <span>🎮 {isSimulating ? 'Simulation ON' : 'Route Sim Mode'}</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400">
          Emits <code className="text-blue-600 font-mono font-bold">sendLocation</code> every 2.4s
        </span>
      </div>
    </div>
  );
};

export default DriverTracker;
