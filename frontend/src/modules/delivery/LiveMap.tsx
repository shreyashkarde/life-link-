import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import io, { Socket } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';

export interface LocationCoords {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

export interface LiveMapProps {
  orderId: string;
  order?: {
    _id?: string;
    id?: string;
    status?: string;
    shippingAddress?: {
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      lat?: number;
      lng?: number;
    };
    destination?: {
      lat: number;
      lng: number;
      address?: string;
    };
    deliveryOtp?: string;
  };
  destination?: {
    lat: number;
    lng: number;
    address?: string;
  };
  initialDriverLocation?: {
    lat: number;
    lng: number;
  };
  socketUrl?: string;
  height?: string | number;
  className?: string;
  showTelemetryHUD?: boolean;
}

// 🚗 High-Resolution Delivery Vehicle SVG Marker Icon
const createVehicleIcon = (heading: number = 0) => {
  const svgHtml = `
    <div style="transform: rotate(${heading}deg); transform-origin: center; transition: transform 0.15s ease-out;">
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <!-- Glowing radar wave -->
        <div style="position: absolute; inset: 0; background: rgba(37, 99, 235, 0.25); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <!-- Outer circular shell -->
        <div style="width: 36px; height: 36px; background: #2563EB; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 14px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">
          🚚
        </div>
        <!-- Direction pointer notch -->
        <div style="position: absolute; top: -2px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 7px solid #2563EB;"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'delivery-live-vehicle-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

// 📍 Destination Pin Icon
const createDestinationIcon = () => {
  const svgHtml = `
    <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 32px; height: 32px; background: #10B981; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">
        📍
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'delivery-destination-marker',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
};

// 🗺️ Smooth Dynamic Map Centering Controller
function MapAutoCenter({ center, isTracking }: { center: [number, number]; isTracking: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0 && center[1] !== 0) {
      map.panTo(center, {
        animate: true,
        duration: 0.6,
        easeLinearity: 0.25,
      });
    }
  }, [center, map]);
  return null;
}

/**
 * 🚀 LiveMap Component
 *
 * Real-time 60fps Interpolated Driver Live Map (Uber/Porter style):
 * - requestAnimationFrame coordinate interpolation (Zero Jumping)
 * - Socket.IO "joinOrder" & "locationUpdate" integration
 * - Smooth vehicle rotation angle calculation
 * - Dynamic route corridor and telemetry HUD
 */
export const LiveMap: React.FC<LiveMapProps> = ({
  orderId,
  order,
  destination: customDestination,
  initialDriverLocation,
  socketUrl = window.location.origin,
  height = '320px',
  className = '',
  showTelemetryHUD = true,
}) => {
  // Destination Coords resolution
  const destCoords = useMemo(() => {
    if (customDestination?.lat && customDestination?.lng) {
      return customDestination;
    }
    if (order?.destination?.lat && order?.destination?.lng) {
      return order.destination;
    }
    if (order?.shippingAddress?.lat && order?.shippingAddress?.lng) {
      return {
        lat: order.shippingAddress.lat,
        lng: order.shippingAddress.lng,
        address: `${order.shippingAddress.address || ''}, ${order.shippingAddress.city || ''}`,
      };
    }
    // Default Mumbai Hub fallback
    return { lat: 19.0522, lng: 72.8295, address: 'Destination Address' };
  }, [customDestination, order]);

  // Initial driver position fallback
  const startPos = useMemo(() => {
    return initialDriverLocation || { lat: 19.076, lng: 72.8777 };
  }, [initialDriverLocation]);

  // Smooth Interpolated Driver Position
  const [currentPos, setCurrentPos] = useState<LocationCoords>({
    lat: startPos.lat,
    lng: startPos.lng,
    heading: 0,
    speed: 0,
    timestamp: Date.now(),
  });

  // Target received from driver socket
  const targetPosRef = useRef<LocationCoords>({
    lat: startPos.lat,
    lng: startPos.lng,
    heading: 0,
    speed: 0,
  });

  const animPosRef = useRef<{ lat: number; lng: number; heading: number }>({
    lat: startPos.lat,
    lng: startPos.lng,
    heading: 0,
  });

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastPacketTime, setLastPacketTime] = useState<number | null>(null);
  const [packetsCount, setPacketsCount] = useState<number>(0);
  const [traveledPath, setTraveledPath] = useState<[number, number][]>([[startPos.lat, startPos.lng]]);
  const animFrameIdRef = useRef<number | null>(null);

  // Bearing calculator between two lat/lng coordinates
  const calculateBearing = (startLat: number, startLng: number, endLat: number, endLng: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const dLng = toRad(endLng - startLng);
    const y = Math.sin(dLng) * Math.cos(toRad(endLat));
    const x =
      Math.cos(toRad(startLat)) * Math.sin(toRad(endLat)) -
      Math.sin(toRad(startLat)) * Math.cos(toRad(endLat)) * Math.cos(dLng);
    const brng = toDeg(Math.atan2(y, x));
    return (brng + 360) % 360;
  };

  // 1. Socket.IO Connection & Room Subscription
  useEffect(() => {
    if (!orderId) return;

    const socket: Socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      // Join isolated order room
      socket.emit('joinOrder', orderId);
      socket.emit('joinOrder', { orderId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle Incoming Live Location Stream
    socket.on('locationUpdate', (data: LocationCoords & { orderId?: string }) => {
      if (data && (!data.orderId || data.orderId === orderId)) {
        const newLat = Number(data.lat);
        const newLng = Number(data.lng);

        if (!isNaN(newLat) && !isNaN(newLng)) {
          // Calculate heading if not provided
          let newHeading = data.heading;
          if (newHeading === undefined && targetPosRef.current) {
            newHeading = calculateBearing(
              targetPosRef.current.lat,
              targetPosRef.current.lng,
              newLat,
              newLng
            );
          }

          targetPosRef.current = {
            lat: newLat,
            lng: newLng,
            heading: newHeading || 0,
            speed: data.speed || 0,
            timestamp: data.timestamp || Date.now(),
          };

          setLastPacketTime(Date.now());
          setPacketsCount((prev) => prev + 1);

          setTraveledPath((prev) => {
            const last = prev[prev.length - 1];
            if (!last || Math.abs(last[0] - newLat) > 0.0001 || Math.abs(last[1] - newLng) > 0.0001) {
              return [...prev.slice(-40), [newLat, newLng]];
            }
            return prev;
          });
        }
      }
    });

    return () => {
      socket.emit('leaveOrder', orderId);
      socket.disconnect();
    };
  }, [orderId, socketUrl]);

  // 2. 🚀 60fps RequestAnimationFrame Smooth Lerp Engine (Uber/Porter Style)
  useEffect(() => {
    let isRunning = true;

    const smoothAnimate = () => {
      if (!isRunning) return;

      const target = targetPosRef.current;
      const current = animPosRef.current;

      // Lerp factor: 0.08 per frame creates smooth glide without lagging behind
      const lerpFactor = 0.08;
      const dLat = target.lat - current.lat;
      const dLng = target.lng - current.lng;

      // Angle interpolation (shortest path)
      let dHeading = (target.heading || 0) - current.heading;
      while (dHeading < -180) dHeading += 360;
      while (dHeading > 180) dHeading -= 360;

      const nextLat = current.lat + dLat * lerpFactor;
      const nextLng = current.lng + dLng * lerpFactor;
      const nextHeading = current.heading + dHeading * lerpFactor;

      animPosRef.current = {
        lat: nextLat,
        lng: nextLng,
        heading: nextHeading,
      };

      setCurrentPos({
        lat: nextLat,
        lng: nextLng,
        heading: nextHeading,
        speed: target.speed,
        timestamp: target.timestamp,
      });

      animFrameIdRef.current = requestAnimationFrame(smoothAnimate);
    };

    animFrameIdRef.current = requestAnimationFrame(smoothAnimate);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // Distance estimation in km
  const remainingDistanceKm = useMemo(() => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(destCoords.lat - currentPos.lat);
    const dLng = toRad(destCoords.lng - currentPos.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(currentPos.lat)) * Math.cos(toRad(destCoords.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  }, [currentPos.lat, currentPos.lng, destCoords]);

  // ETA in minutes
  const etaMinutes = useMemo(() => {
    const dist = parseFloat(remainingDistanceKm) || 1.5;
    return Math.max(2, Math.round(dist * 2.8));
  }, [remainingDistanceKm]);

  const vehicleIcon = useMemo(() => {
    return createVehicleIcon(currentPos.heading || 0);
  }, [currentPos.heading]);

  const destinationIcon = useMemo(() => {
    return createDestinationIcon();
  }, []);

  const isDelivered = order?.status === 'Delivered';
  const isCancelled = order?.status === 'Cancelled';

  if (isDelivered || isCancelled) {
    return null;
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm ${className}`}>
      {/* Telemetry Status Floating HUD */}
      {showTelemetryHUD && (
        <div className="absolute top-3 left-3 right-3 z-400 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200/80 shadow-md flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-base shrink-0 font-black border border-blue-100">
              🚚
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 truncate">
                  Order #{orderId.slice(-6).toUpperCase()}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'
                  }`}
                  title={isConnected ? 'Live Socket Connected' : 'Connecting to Driver...'}
                ></span>
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                {isConnected ? 'Live GPS Stream Active (60fps)' : 'Connecting socket stream...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-right">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">ETA</p>
              <p className="text-xs font-black text-blue-600">~{etaMinutes} mins</p>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <p className="text-[10px] uppercase font-bold text-slate-400">Distance</p>
              <p className="text-xs font-black text-slate-800">{remainingDistanceKm} km</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaflet Map Canvas */}
      <div style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }}>
        <MapContainer
          center={[currentPos.lat, currentPos.lng]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Smooth Traveled Trail Polyline */}
          {traveledPath.length > 1 && (
            <Polyline
              positions={traveledPath}
              pathOptions={{
                color: '#3B82F6',
                weight: 4,
                opacity: 0.75,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          )}

          {/* Smooth Interpolated Driver Marker */}
          <Marker position={[currentPos.lat, currentPos.lng]} icon={vehicleIcon}>
            <Popup>
              <div className="p-1 text-xs">
                <p className="font-bold text-slate-900">🚚 Delivery Partner En Route</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Speed: {Math.round(currentPos.speed || 32)} km/h</p>
                <p className="text-[10px] text-blue-600 font-bold">Packets Synced: {packetsCount}</p>
              </div>
            </Popup>
          </Marker>

          {/* Destination Marker */}
          {destCoords.lat && destCoords.lng && (
            <Marker position={[destCoords.lat, destCoords.lng]} icon={destinationIcon}>
              <Popup>
                <div className="p-1 text-xs">
                  <p className="font-bold text-slate-900">📍 Destination Address</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{destCoords.address || 'Delivery Location'}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Dynamic Map Auto-Center */}
          <MapAutoCenter center={[currentPos.lat, currentPos.lng]} isTracking={true} />
        </MapContainer>
      </div>

      {/* Bottom Sub-Telemetry Bar */}
      <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          <span>Target: {destCoords.address || 'Customer Location'}</span>
        </span>
        <span className="font-mono font-bold text-slate-500">
          {currentPos.lat.toFixed(4)}, {currentPos.lng.toFixed(4)}
        </span>
      </div>
    </div>
  );
};

export default LiveMap;
