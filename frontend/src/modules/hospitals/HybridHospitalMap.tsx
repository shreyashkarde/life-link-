import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Star,
  Clock,
  Compass,
  Search,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  LocateFixed,
  AlertCircle,
  Building2,
  PhoneCall,
  CheckCircle2,
  Layers,
  Route as RouteIcon,
  Sparkles,
  Bed,
  Phone,
} from 'lucide-react';
import apiClient from '../../services/apiClient';

export interface UnifiedHospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  source: 'database' | 'google';
  rating: number;
  user_ratings_total?: number;
  distance: number;
  estimatedDriveMinutes?: number;
  phone?: string;
  emergencyContact?: string;
  icuBedsAvailable?: number;
  totalBeds?: number;
  traumaLevel?: string;
  specialities?: string[];
  open_now?: boolean;
  place_id?: string;
  googleMapsUrl?: string;
}

interface HybridHospitalMapProps {
  onSelectHospital?: (hospital: UnifiedHospital) => void;
  className?: string;
  initialRadius?: number;
}

export const HybridHospitalMap: React.FC<HybridHospitalMapProps> = ({
  onSelectHospital,
  className = '',
  initialRadius = 10000,
}) => {
  // State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 19.076,
    lng: 72.8777, // Default Mumbai
  });
  const [hospitals, setHospitals] = useState<UnifiedHospital[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<UnifiedHospital | null>(null);
  const [activeDirections, setActiveDirections] = useState<UnifiedHospital | null>(null);
  const [radius, setRadius] = useState<number>(initialRadius);
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'list'>('both');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'database' | 'google'>('ALL');
  const [dbCount, setDbCount] = useState<number>(0);
  const [googleCount, setGoogleCount] = useState<number>(0);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // 1. Detect Live GPS Location
  const getUserLiveLocation = useCallback(() => {
    if (!navigator.geolocation) {
      loadHybridHospitals(userLocation.lat, userLocation.lng, radius, debouncedSearch);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        setIsLocating(false);
        loadHybridHospitals(coords.lat, coords.lng, radius, debouncedSearch);
      },
      (err) => {
        console.warn('GPS location permission notice:', err.message);
        setIsLocating(false);
        loadHybridHospitals(userLocation.lat, userLocation.lng, radius, debouncedSearch);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [radius, debouncedSearch]);

  // 2. Fetch Hybrid Hospitals from Backend API
  const loadHybridHospitals = async (lat: number, lng: number, rad: number, searchTerm: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/api/hospitals/hybrid', {
        params: {
          lat,
          lng,
          radius: rad,
          search: searchTerm || undefined,
        },
      });

      if (res.data?.success && Array.isArray(res.data.hospitals)) {
        setHospitals(res.data.hospitals);
        setDbCount(res.data.dbCount || 0);
        setGoogleCount(res.data.googleCount || 0);
        if (res.data.hospitals.length > 0 && !selectedHospital) {
          setSelectedHospital(res.data.hospitals[0]);
        }
      } else {
        setHospitals([]);
      }
    } catch (err: any) {
      console.error('Failed to load hybrid hospitals:', err);
      setError('Failed to fetch nearby hospitals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUserLiveLocation();
  }, []);

  useEffect(() => {
    loadHybridHospitals(userLocation.lat, userLocation.lng, radius, debouncedSearch);
  }, [radius, debouncedSearch]);

  // Filtered hospitals based on source
  const displayedHospitals = hospitals.filter((h) => {
    if (sourceFilter === 'ALL') return true;
    return h.source === sourceFilter;
  });

  const handleMarkerClick = (hospital: UnifiedHospital) => {
    setSelectedHospital(hospital);
    if (onSelectHospital) {
      onSelectHospital(hospital);
    }
  };

  const handleGetDirections = (hospital: UnifiedHospital) => {
    setActiveDirections(hospital);
    setSelectedHospital(hospital);
  };

  const openGoogleMapsExternal = (hospital: UnifiedHospital) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${hospital.lat},${hospital.lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div className={`w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col ${className}`}>
      {/* 🌟 Header & Control Bar */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl text-white shadow-inner">
                <Building2 className="w-6 h-6 text-white" />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Hybrid Hospital Discovery
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    DB Priority + Google Places Live
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-blue-100/80 mt-0.5">
                  Real-time intelligent routing combining in-network hospital beds with live Google Places facilities
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics & GPS Trigger */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 text-xs text-blue-100">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
              <span>DB In-Network: <strong>{dbCount}</strong></span>
              <span className="text-white/40">|</span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
              <span>Google Places: <strong>{googleCount}</strong></span>
            </div>

            <button
              onClick={getUserLiveLocation}
              disabled={isLocating}
              className="px-3.5 py-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-semibold rounded-xl backdrop-blur-md transition flex items-center gap-1.5 border border-white/20 shadow-sm"
              title="Locate my GPS position"
            >
              <LocateFixed className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Locating...' : 'My Location'}</span>
            </button>

            <button
              onClick={() => loadHybridHospitals(userLocation.lat, userLocation.lng, radius, debouncedSearch)}
              disabled={loading}
              className="p-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-xl backdrop-blur-md transition border border-white/20"
              title="Refresh nearby data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 🔍 Search, Filters & Source Switcher */}
        <div className="mt-4 pt-4 border-t border-white/15 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200" />
            <input
              type="text"
              placeholder="Search hospital, trauma, ICU, cardio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder-blue-200 text-xs sm:text-sm rounded-xl border border-white/20 outline-none transition"
            />
          </div>

          {/* Source Filter Tabs */}
          <div className="flex items-center gap-1.5 self-start md:self-auto bg-black/20 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setSourceFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                sourceFilter === 'ALL' ? 'bg-white text-slate-900 shadow' : 'text-blue-100 hover:text-white'
              }`}
            >
              All ({hospitals.length})
            </button>
            <button
              onClick={() => setSourceFilter('database')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                sourceFilter === 'database' ? 'bg-blue-600 text-white shadow' : 'text-blue-100 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-300"></span>
              DB In-Network ({dbCount})
            </button>
            <button
              onClick={() => setSourceFilter('google')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                sourceFilter === 'google' ? 'bg-rose-600 text-white shadow' : 'text-blue-100 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-300"></span>
              Google Real ({googleCount})
            </button>
          </div>

          {/* Radius Selector */}
          <div className="flex items-center gap-1 self-start md:self-auto">
            <span className="text-xs text-blue-200 font-medium mr-1 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" /> Radius:
            </span>
            {[5000, 10000, 20000].map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  radius === r ? 'bg-white text-indigo-900 shadow-md scale-105' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {r / 1000} km
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🧭 Active Turn-by-Turn Directions Banner */}
      {activeDirections && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-3.5 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <RouteIcon className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded text-emerald-100">
                  Live Navigation Route
                </span>
                <span className="text-sm font-bold text-white">{activeDirections.name}</span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Distance: <strong>{activeDirections.distance} km</strong> | Estimated Driving Time:{' '}
                <strong>~{activeDirections.estimatedDriveMinutes || Math.round(activeDirections.distance * 2.2)} mins</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => openGoogleMapsExternal(activeDirections)}
              className="px-3.5 py-1.5 bg-white text-emerald-800 text-xs font-bold rounded-xl shadow hover:bg-emerald-50 transition flex items-center gap-1.5"
            >
              <span>Launch Google Navigation</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveDirections(null)}
              className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition"
            >
              Close Route
            </button>
          </div>
        </div>
      )}

      {/* 🗺️ Main Grid: Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px] flex-1">
        {/* 📋 Left Panel: Unified Hospital Cards List */}
        <div className="lg:col-span-5 border-r border-slate-200 dark:border-slate-800 flex flex-col max-h-[640px] overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
          <div className="p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              Showing {displayedHospitals.length} facilities
            </span>
            <span className="text-[11px]">Database priority ranked</span>
          </div>

          {/* Cards List Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-2 sm:p-3 space-y-2.5">
            {loading ? (
              <div className="space-y-3 p-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse bg-white dark:bg-slate-800 space-y-2.5">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    <div className="flex gap-2 pt-2">
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-6 text-center text-rose-500 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto" />
                <p className="text-sm font-medium">{error}</p>
                <button
                  onClick={() => loadHybridHospitals(userLocation.lat, userLocation.lng, radius, debouncedSearch)}
                  className="px-3 py-1.5 bg-rose-50 text-rose-600 text-xs font-semibold rounded-lg hover:bg-rose-100 transition"
                >
                  Retry Search
                </button>
              </div>
            ) : displayedHospitals.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-3">
                <Building2 className="w-10 h-10 mx-auto text-slate-400" />
                <p className="text-sm font-medium">No hospitals match your search within {radius / 1000} km.</p>
                <button
                  onClick={() => setRadius(radius + 5000)}
                  className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-xl hover:bg-indigo-100 transition"
                >
                  Expand Radius to {(radius + 5000) / 1000} km
                </button>
              </div>
            ) : (
              displayedHospitals.map((hospital) => {
                const isSelected = selectedHospital?.id === hospital.id;
                const isDirectionsActive = activeDirections?.id === hospital.id;
                const isDb = hospital.source === 'database';

                return (
                  <div
                    key={hospital.id}
                    onClick={() => handleMarkerClick(hospital)}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-md shadow-indigo-500/10 ring-2 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Source Badge */}
                          {isDb ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                              🔵 In-Network DB
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                              🔴 Google Places
                            </span>
                          )}

                          {hospital.traumaLevel && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">
                              {hospital.traumaLevel}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5 line-clamp-1">
                          {hospital.name}
                        </h3>

                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1 mt-1 line-clamp-2">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                          <span>{hospital.address}</span>
                        </p>
                      </div>

                      {/* Distance & ETA */}
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60">
                          {hospital.distance} km
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          ~{hospital.estimatedDriveMinutes || Math.round(hospital.distance * 2.2)}m drive
                        </span>
                      </div>
                    </div>

                    {/* In-Network Perks (ICU Beds & Doctors) */}
                    {isDb && hospital.icuBedsAvailable !== undefined && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                        <span className="flex items-center gap-1">
                          <Bed className="w-3.5 h-3.5 text-emerald-600" />
                          {hospital.icuBedsAvailable} ICU Beds Available
                        </span>
                        <span>•</span>
                        <span>{hospital.totalBeds || 300} Total Beds</span>
                      </div>
                    )}

                    {/* Actions & Rating */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-amber-500 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded text-[11px]">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          {hospital.rating.toFixed(1)}
                          <span className="text-slate-400 text-[10px]">({hospital.user_ratings_total || 50})</span>
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                          Open 24/7
                        </span>
                      </div>

                      {/* Direction CTA */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGetDirections(hospital);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          isDirectionsActive
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>{isDirectionsActive ? 'Route Active' : 'Directions'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 🗺️ Right Panel: Interactive Google Map Simulation & Vector Canvas */}
        <div className="lg:col-span-7 relative bg-slate-900 flex flex-col min-h-[460px] overflow-hidden">
          {/* Background Vector Map Grid */}
          <div className="absolute inset-0 bg-slate-950">
            <svg className="w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="hybrid-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                  <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#1e293b" strokeWidth="1" />
                </pattern>
                <pattern id="hybrid-roads" width="180" height="180" patternUnits="userSpaceOnUse">
                  <path d="M 0 90 Q 90 45 180 90" fill="none" stroke="#334155" strokeWidth="3" strokeDasharray="8 6" />
                  <path d="M 90 0 Q 135 90 90 180" fill="none" stroke="#334155" strokeWidth="3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hybrid-grid)" />
              <rect width="100%" height="100%" fill="url(#hybrid-roads)" />
            </svg>

            {/* Pulsing Radar Ring around Live User Location */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-72 h-72 rounded-full border border-blue-500/25 animate-ping opacity-25"></div>
              <div className="w-[450px] h-[450px] rounded-full border border-indigo-500/15"></div>
            </div>
          </div>

          {/* 📍 Route Polyline Corridor (When Directions are Active) */}
          {activeDirections && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>
              {/* Dynamic Connecting Corridor Curve */}
              <line
                x1="50%"
                y1="50%"
                x2={`${Math.min(88, Math.max(12, 50 + (activeDirections.lng - userLocation.lng) * 12000))}%`}
                y2={`${Math.min(88, Math.max(12, 50 - (activeDirections.lat - userLocation.lat) * 12000))}%`}
                stroke="url(#routeGrad)"
                strokeWidth="4"
                strokeDasharray="8 6"
                strokeLinecap="round"
                className="animate-pulse"
              />
            </svg>
          )}

          {/* 👤 Live User Location Pin */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center group cursor-pointer"
            title="Your GPS Coordinates"
          >
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-blue-500/30 animate-ping absolute"></div>
              <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center text-white z-10">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
              </div>
            </div>
            <span className="mt-1 px-2.5 py-0.5 bg-slate-900/90 text-white text-[10px] font-extrabold rounded-full shadow-lg border border-slate-700 backdrop-blur-md whitespace-nowrap">
              You (Live GPS)
            </span>
          </div>

          {/* 🏥 Hybrid Hospital Markers (🔵 DB vs 🔴 Google) */}
          {displayedHospitals.map((hosp) => {
            const latDiff = hosp.lat - userLocation.lat;
            const lngDiff = hosp.lng - userLocation.lng;
            const scale = 12000;
            const leftPercent = Math.min(88, Math.max(12, 50 + lngDiff * scale));
            const topPercent = Math.min(88, Math.max(12, 50 - latDiff * scale));

            const isSelected = selectedHospital?.id === hosp.id;
            const isDirections = activeDirections?.id === hosp.id;
            const isDb = hosp.source === 'database';

            return (
              <div
                key={hosp.id}
                onClick={() => handleMarkerClick(hosp)}
                style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer transition-all duration-300 group ${
                  isSelected || isDirections ? 'scale-125 z-30' : 'hover:scale-110 hover:z-20'
                }`}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`p-2 rounded-full shadow-xl border-2 transition ${
                      isDirections
                        ? 'bg-emerald-500 border-white text-white ring-4 ring-emerald-400/50 animate-bounce'
                        : isSelected
                        ? isDb
                          ? 'bg-blue-600 border-white text-white ring-4 ring-blue-500/40 animate-bounce'
                          : 'bg-rose-600 border-white text-white ring-4 ring-rose-500/40 animate-bounce'
                        : isDb
                        ? 'bg-blue-600 text-white border-blue-400 hover:bg-blue-700'
                        : 'bg-rose-600 text-white border-rose-400 hover:bg-rose-700'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                  </div>

                  <span
                    className={`mt-1 px-2 py-0.5 text-[9px] font-extrabold rounded-md shadow-md whitespace-nowrap max-w-[130px] truncate transition ${
                      isDirections
                        ? 'bg-emerald-600 text-white shadow-emerald-900/60'
                        : isSelected
                        ? isDb
                          ? 'bg-blue-600 text-white shadow-blue-900/60'
                          : 'bg-rose-600 text-white shadow-rose-900/60'
                        : 'bg-slate-900/90 text-slate-200 group-hover:bg-slate-900 border border-slate-800'
                    }`}
                  >
                    {isDb ? '🔵' : '🔴'} {hosp.name} ({hosp.distance}km)
                  </span>
                </div>
              </div>
            );
          })}

          {/* 🪟 InfoWindow Popup Card on Marker Click */}
          {selectedHospital && (
            <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 z-30 transition-all animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-3 rounded-xl border ${
                      selectedHospital.source === 'database'
                        ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/60 dark:border-blue-900'
                        : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/60 dark:border-rose-900'
                    }`}
                  >
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedHospital.source === 'database' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          🔵 Verified In-Network DB
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          🔴 Google Places Live
                        </span>
                      )}
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {selectedHospital.name}
                      </h4>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                      {selectedHospital.address}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                      <span className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {selectedHospital.rating.toFixed(1)} ({selectedHospital.user_ratings_total || 50} reviews)
                      </span>
                      <span>•</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                        {selectedHospital.distance} km away (~{selectedHospital.estimatedDriveMinutes || Math.round(selectedHospital.distance * 2.2)} min drive)
                      </span>
                    </div>
                  </div>
                </div>

                {/* InfoWindow Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleGetDirections(selectedHospital)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Get Directions</span>
                  </button>

                  <button
                    onClick={() => openGoogleMapsExternal(selectedHospital)}
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl transition"
                    title="Open in Google Maps App"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
            <button
              onClick={getUserLiveLocation}
              className="p-3 bg-slate-900/90 hover:bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700 transition backdrop-blur-md"
              title="Center map to GPS location"
            >
              <LocateFixed className="w-5 h-5 text-blue-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HybridHospitalMap;
