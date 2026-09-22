import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Default Marker Icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom SVG Icons for Patient, Ambulance, and Hospital
const createCustomIcon = (color: string, iconText: string) => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        border: 2.5px solid white;
        font-size: 16px;
      ">
        ${iconText}
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
};

const ambulanceIcon = createCustomIcon('#2563EB', '🚑');
const patientIcon = createCustomIcon('#EF4444', '📍');
const hospitalIcon = createCustomIcon('#10B981', '🏥');

// Map auto-fit bounds helper
const AutoBounds: React.FC<{ positions: [number, number][] }> = ({ positions }) => {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const validPositions = positions.filter(
        (p) => typeof p[0] === 'number' && typeof p[1] === 'number' && !isNaN(p[0]) && !isNaN(p[1])
      );
      if (validPositions.length === 1) {
        map.setView(validPositions[0], 14);
      } else if (validPositions.length > 1) {
        const bounds = L.latLngBounds(validPositions);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [positions, map]);

  return null;
};

interface LiveTrackingMapProps {
  driverLocation?: { lat: number; lng: number };
  pickupLocation?: { lat: number; lng: number; address?: string };
  hospitalLocation?: { lat: number; lng: number; name?: string };
  height?: string;
  zoom?: number;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  driverLocation,
  pickupLocation,
  hospitalLocation,
  height = '420px',
  zoom = 13,
}) => {
  const defaultCenter: [number, number] = [
    driverLocation?.lat || pickupLocation?.lat || 19.076,
    driverLocation?.lng || pickupLocation?.lng || 72.8777,
  ];

  const routePoints: [number, number][] = [];
  if (driverLocation) routePoints.push([driverLocation.lat, driverLocation.lng]);
  if (pickupLocation) routePoints.push([pickupLocation.lat, pickupLocation.lng]);
  if (hospitalLocation) routePoints.push([hospitalLocation.lat, hospitalLocation.lng]);

  return (
    <div className="w-full relative overflow-hidden rounded-2xl shadow-card border border-surface-100" style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto fit bounds to show all markers */}
        <AutoBounds positions={routePoints} />

        {/* Dynamic Route Polyline */}
        {routePoints.length >= 2 && (
          <Polyline
            positions={routePoints}
            color="#2563EB"
            weight={4}
            opacity={0.8}
            dashArray="8, 6"
          />
        )}

        {/* Driver Marker */}
        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={ambulanceIcon}>
            <Popup>
              <div className="text-xs p-1">
                <p className="font-bold text-blue-600">🚑 Ambulance Live</p>
                <p className="text-surface-500">Live GPS Location</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Patient Pickup Marker */}
        {pickupLocation && (
          <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={patientIcon}>
            <Popup>
              <div className="text-xs p-1">
                <p className="font-bold text-rose-600">📍 Patient Pickup Location</p>
                <p className="text-surface-500">{pickupLocation.address || 'Pickup Point'}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Hospital Destination Marker */}
        {hospitalLocation && (
          <Marker position={[hospitalLocation.lat, hospitalLocation.lng]} icon={hospitalIcon}>
            <Popup>
              <div className="text-xs p-1">
                <p className="font-bold text-emerald-600">🏥 Emergency Center</p>
                <p className="text-surface-500">{hospitalLocation.name || 'Hospital'}</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Status Pill */}
      <div className="absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-soft border border-surface-200 flex items-center gap-2 text-xs font-semibold text-surface-800">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span>Live GPS Dispatch Active</span>
      </div>
    </div>
  );
};
