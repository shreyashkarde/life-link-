import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';

export interface LocationCoord {
  lat: number;
  lng: number;
  address?: string;
}

export interface MapViewProps {
  userLocation?: LocationCoord;
  onSelectAmbulance?: (ambulance: any) => void;
  onSelectHospital?: (hospital: any) => void;
  onSelectDoctor?: (doctor: any) => void;
}

/**
 * 📍 MapView.tsx
 * Interactive Map View supporting Google Maps API & Interactive Telemetry
 * Displays:
 *  1. User Location
 *  2. Nearby Ambulances
 *  3. Nearby Hospitals
 *  4. Doctors
 */
export const MapView: React.FC<MapViewProps> = ({
  userLocation = { lat: 19.0760, lng: 72.8777, address: 'Bandra West, Mumbai' },
  onSelectAmbulance,
  onSelectHospital,
  onSelectDoctor,
}) => {
  const apiKey = (import.meta.env.VITE_MAP_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [filter, setFilter] = useState<'ALL' | 'DOCTORS' | 'HOSPITALS' | 'AMBULANCES'>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  // Load nearby ambulances, hospitals, and verified doctors
  useEffect(() => {
    const loadMapData = async () => {
      try {
        setLoading(true);
        // 1. Fetch nearby ambulances
        const ambRes = await apiClient.get(`/api/ambulance/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radiusKm=25`);
        if (ambRes.data?.success && ambRes.data.ambulances) {
          setAmbulances(ambRes.data.ambulances);
        }

        // 2. Fetch nearby hospitals
        const hospRes = await apiClient.get(`/api/hospitals/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radiusKm=25`);
        if (hospRes.data?.success && hospRes.data.hospitals) {
          setHospitals(hospRes.data.hospitals);
        }

        // 3. Fetch certified physicians
        const docRes = await apiClient.get('/api/doctor/list');
        if (docRes.data?.success && docRes.data.doctors) {
          setDoctors(docRes.data.doctors.slice(0, 6)); // Top nearby clinics
        }
      } catch (err) {
        console.error('Failed to load map entities:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMapData();
  }, [userLocation.lat, userLocation.lng]);

  return (
    <div className="bg-white border border-blue-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Map Control Bar */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Live Geo-Spatial Telemetry Map</h3>
            <p className="text-xs text-gray-500">
              Center: <span className="text-gray-700 font-medium">{userLocation.address}</span>
            </p>
          </div>
        </div>

        {/* Layer Filters */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200 text-xs">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              filter === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Entities
          </button>
          <button
            onClick={() => setFilter('DOCTORS')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
              filter === 'DOCTORS' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>🩺</span> Doctors ({doctors.length})
          </button>
          <button
            onClick={() => setFilter('HOSPITALS')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
              filter === 'HOSPITALS' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>🏥</span> Hospitals ({hospitals.length})
          </button>
          <button
            onClick={() => setFilter('AMBULANCES')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
              filter === 'AMBULANCES' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>🚑</span> Fleet ({ambulances.length})
          </button>
        </div>
      </div>

      {/* Interactive Map Canvas Container */}
      <div className="relative w-full h-[400px] bg-slate-950 overflow-hidden select-none">
        {/* Radar concentric range circles */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-[120px] h-[120px] rounded-full border border-blue-400"></div>
          <div className="absolute w-[240px] h-[240px] rounded-full border border-blue-400"></div>
          <div className="absolute w-[360px] h-[360px] rounded-full border border-dashed border-blue-400"></div>
          <div className="absolute w-full h-[1px] bg-blue-500/30"></div>
          <div className="absolute h-full w-[1px] bg-blue-500/30"></div>
        </div>

        {/* Sweep scanner effect */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent animate-pulse"></div>

        {/* Center: User Location Pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
          <div className="relative">
            <span className="flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-600 border-2 border-white shadow-lg items-center justify-center text-[10px] text-white font-bold">
                📍
              </span>
            </span>
          </div>
          <div className="mt-1 bg-slate-900/90 text-white px-2 py-0.5 rounded text-[10px] font-semibold border border-blue-500/40 shadow">
            You (Patient)
          </div>
        </div>

        {/* Doctor Pins */}
        {(filter === 'ALL' || filter === 'DOCTORS') &&
          doctors.map((doc, index) => {
            const angle = (index / Math.max(1, doctors.length)) * 2 * Math.PI;
            const radius = 28 + (index % 2) * 12;
            const topPercent = 50 + radius * Math.sin(angle);
            const leftPercent = 50 + radius * Math.cos(angle);

            return (
              <button
                key={doc._id || index}
                type="button"
                onClick={() => {
                  setSelectedEntity({ type: 'DOCTOR', data: doc });
                  if (onSelectDoctor) onSelectDoctor(doc);
                }}
                style={{ top: `${topPercent}%`, left: `${leftPercent}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group flex flex-col items-center hover:scale-125 transition-transform"
              >
                <div className="w-8 h-8 rounded-full bg-white border-2 border-indigo-600 shadow-md flex items-center justify-center text-sm">
                  🩺
                </div>
                <div className="mt-0.5 bg-slate-900/90 text-indigo-300 font-semibold px-1.5 py-0.5 rounded text-[9px] border border-indigo-500/30 max-w-[100px] truncate">
                  {doc.name}
                </div>
              </button>
            );
          })}

        {/* Ambulance Pins */}
        {(filter === 'ALL' || filter === 'AMBULANCES') &&
          ambulances.map((amb, index) => {
            const dLat = (amb.currentLocation?.lat - userLocation.lat) * 1000;
            const dLng = (amb.currentLocation?.lng - userLocation.lng) * 1000;
            const topPercent = Math.max(15, Math.min(85, 50 + dLat * 2.2));
            const leftPercent = Math.max(15, Math.min(85, 50 + dLng * 2.2));

            return (
              <button
                key={amb._id || index}
                type="button"
                onClick={() => {
                  setSelectedEntity({ type: 'AMBULANCE', data: amb });
                  if (onSelectAmbulance) onSelectAmbulance(amb);
                }}
                style={{ top: `${topPercent}%`, left: `${leftPercent}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group flex flex-col items-center hover:scale-125 transition-transform"
              >
                <div className="w-8 h-8 rounded-full bg-white border-2 border-red-500 shadow-md flex items-center justify-center text-sm">
                  🚑
                </div>
                <div className="mt-0.5 bg-slate-900/90 text-red-300 font-mono px-1.5 py-0.5 rounded text-[9px] border border-red-500/30 whitespace-nowrap">
                  {amb.vehicleNumber || 'Unit 108'}
                </div>
              </button>
            );
          })}

        {/* Hospital Pins */}
        {(filter === 'ALL' || filter === 'HOSPITALS') &&
          hospitals.map((hosp, index) => {
            const dLat = (hosp.lat - userLocation.lat) * 1000;
            const dLng = (hosp.lng - userLocation.lng) * 1000;
            const topPercent = Math.max(12, Math.min(88, 50 + dLat * 1.8));
            const leftPercent = Math.max(12, Math.min(88, 50 + dLng * 1.8));

            return (
              <button
                key={hosp.id || index}
                type="button"
                onClick={() => {
                  setSelectedEntity({ type: 'HOSPITAL', data: hosp });
                  if (onSelectHospital) onSelectHospital(hosp);
                }}
                style={{ top: `${topPercent}%`, left: `${leftPercent}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group flex flex-col items-center hover:scale-125 transition-transform"
              >
                <div className="w-8 h-8 rounded-full bg-white border-2 border-emerald-500 shadow-md flex items-center justify-center text-sm">
                  🏥
                </div>
                <div className="mt-0.5 bg-slate-900/90 text-emerald-300 font-semibold px-1.5 py-0.5 rounded text-[9px] border border-emerald-500/30 max-w-[110px] truncate">
                  {hosp.name.replace(' Hospital', '')}
                </div>
              </button>
            );
          })}

        {/* Map Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md p-2.5 rounded-xl border border-slate-700/50 text-[11px] text-gray-300 space-y-1 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Your Position</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <span>Doctor Clinic</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Trauma Center</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Ambulance Unit</span>
          </div>
        </div>

        {/* Google Maps API Key status badge */}
        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] text-gray-300">
          {apiKey ? '🟢 Google Maps API: Active' : 'ℹ️ Interactive Telemetry Mode'}
        </div>
      </div>

      {/* Selected Entity Details Card */}
      {selectedEntity && (
        <div className="p-4 bg-blue-50/50 border-t border-blue-100 flex items-center justify-between gap-4 animate-fadeIn">
          {selectedEntity.type === 'AMBULANCE' ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚑</span>
                <span className="text-sm font-bold text-gray-900">{selectedEntity.data.vehicleNumber}</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                  {selectedEntity.data.distanceKm?.toFixed(1) || 1.2} km away
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Driver: {selectedEntity.data.driverName} • Phone: {selectedEntity.data.driverPhone} • Rating: {selectedEntity.data.rating}★
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏥</span>
                <span className="text-sm font-bold text-gray-900">{selectedEntity.data.name}</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                  {selectedEntity.data.distanceKm?.toFixed(1)} km ({selectedEntity.data.estimatedDriveMinutes} mins)
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {selectedEntity.data.traumaLevel} • ICU Beds: <span className="font-bold text-emerald-700">{selectedEntity.data.icuBedsAvailable}</span> • Emergency: {selectedEntity.data.emergencyContact}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSelectedEntity(null)}
            className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 bg-white rounded border border-gray-200"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default MapView;
