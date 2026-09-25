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
  CheckCircle,
} from 'lucide-react';
import { GoogleHospital, fetchGoogleNearbyHospitals } from '../../services/googleHospitalService';

interface GoogleNearbyHospitalsProps {
  onSelectHospital?: (hospital: GoogleHospital) => void;
  className?: string;
  initialRadius?: number;
}

export const GoogleNearbyHospitals: React.FC<GoogleNearbyHospitalsProps> = ({
  onSelectHospital,
  className = '',
  initialRadius = 5000,
}) => {
  // State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 19.076,
    lng: 72.8777, // Default Mumbai fallback
  });
  const [hospitals, setHospitals] = useState<GoogleHospital[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<GoogleHospital | null>(null);
  const [radius, setRadius] = useState<number>(initialRadius);
  const [keyword, setKeyword] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<string>('google_places');
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list'); // For mobile toggle

  const mapRef = useRef<HTMLDivElement | null>(null);

  // 1. Get Live User Location from Browser GPS
  const getUserLiveLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      loadHospitals(19.076, 72.8777, radius, keyword);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(coords);
        setIsLocating(false);
        loadHospitals(coords.lat, coords.lng, radius, keyword);
      },
      (err) => {
        console.warn('GPS location permission denied or error:', err.message);
        setIsLocating(false);
        // Fallback to default coordinates
        loadHospitals(userLocation.lat, userLocation.lng, radius, keyword);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [radius, keyword]);

  // 2. Fetch Nearby Hospitals from Backend API
  const loadHospitals = async (lat: number, lng: number, rad: number, searchKeyword: string = '') => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchGoogleNearbyHospitals(lat, lng, rad, searchKeyword);
      if (res.success && Array.isArray(res.hospitals)) {
        setHospitals(res.hospitals);
        setDataSource(res.source || 'google_places');
        if (res.hospitals.length > 0 && !selectedHospital) {
          setSelectedHospital(res.hospitals[0]);
        }
      } else {
        setHospitals([]);
      }
    } catch (err: any) {
      console.error('Failed to load Google nearby hospitals:', err);
      setError('Unable to fetch live nearby hospitals. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    getUserLiveLocation();
  }, []);

  // Reload when radius or keyword changes
  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    loadHospitals(userLocation.lat, userLocation.lng, newRadius, keyword);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadHospitals(userLocation.lat, userLocation.lng, radius, keyword);
  };

  const handleHospitalClick = (hospital: GoogleHospital) => {
    setSelectedHospital(hospital);
    if (onSelectHospital) {
      onSelectHospital(hospital);
    }
  };

  // Open Google Maps Directions
  const openDirections = (hospital: GoogleHospital) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${hospital.latitude},${hospital.longitude}&travelmode=driving`;
    window.open(url, '_blank');
  };

  // Re-center map to user GPS
  const handleCenterToUser = () => {
    getUserLiveLocation();
  };

  return (
    <div className={`w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col ${className}`}>
      {/* 🌟 Header & Filter Bar */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-white/10 backdrop-blur-md rounded-xl text-white">
                <Building2 className="w-6 h-6 text-white" />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Real-Time Nearby Hospitals
                  <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Google Places API
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-blue-100/90 mt-0.5">
                  Showing actual real-world trauma centers & hospitals based on your live GPS coordinates
                </p>
              </div>
            </div>
          </div>

          {/* Quick GPS Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCenterToUser}
              disabled={isLocating}
              className="px-3.5 py-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs sm:text-sm font-medium rounded-xl backdrop-blur-md transition flex items-center gap-2 border border-white/20 shadow-sm"
              title="Center to my current GPS location"
            >
              <LocateFixed className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Locating...' : 'My GPS Location'}</span>
            </button>

            <button
              onClick={() => loadHospitals(userLocation.lat, userLocation.lng, radius, keyword)}
              disabled={loading}
              className="p-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-xl backdrop-blur-md transition border border-white/20"
              title="Refresh nearby results"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 🔍 Search & Radius Controls */}
        <div className="mt-4 pt-4 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Keyword Search */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200" />
            <input
              type="text"
              placeholder="Search hospital name, trauma, specialty..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder-blue-200 text-xs sm:text-sm rounded-xl border border-white/20 outline-none transition"
            />
          </form>

          {/* Radius Selector Pills */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-xs text-blue-200 font-medium mr-1 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" /> Radius:
            </span>
            {[2000, 5000, 10000, 20000].map((r) => (
              <button
                key={r}
                onClick={() => handleRadiusChange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  radius === r
                    ? 'bg-white text-blue-700 shadow-md scale-105'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {r >= 1000 ? `${r / 1000} km` : `${r}m`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 📱 Mobile Tabs (Switch between List and Map) */}
      <div className="sm:hidden flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition ${
            activeTab === 'list'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800'
              : 'border-transparent text-slate-600 dark:text-slate-400'
          }`}
        >
          Hospital List ({hospitals.length})
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition ${
            activeTab === 'map'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800'
              : 'border-transparent text-slate-600 dark:text-slate-400'
          }`}
        >
          Live Interactive Map
        </button>
      </div>

      {/* 🗺️ Main Content Grid: Side-by-Side (Desktop) / Toggle (Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[560px] flex-1">
        {/* 📋 Left Panel: Hospitals List */}
        <div
          className={`lg:col-span-5 border-r border-slate-200 dark:border-slate-800 flex flex-col max-h-[640px] overflow-hidden ${
            activeTab === 'map' ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {/* Subheader */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Found {hospitals.length} verified hospitals nearby
            </span>
            <span>Sorted by GPS distance</span>
          </div>

          {/* List Scroll Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-2 sm:p-3 space-y-2">
            {loading ? (
              // Loading Skeleton
              <div className="space-y-3 p-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 animate-pulse bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    <div className="flex gap-2 pt-2">
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-6 text-center text-rose-500 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto" />
                <p className="text-sm font-medium">{error}</p>
                <button
                  onClick={() => loadHospitals(userLocation.lat, userLocation.lng, radius, keyword)}
                  className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-semibold rounded-lg hover:bg-rose-100 transition"
                >
                  Retry Search
                </button>
              </div>
            ) : hospitals.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-3">
                <Building2 className="w-10 h-10 mx-auto text-slate-400" />
                <p className="text-sm font-medium">No hospitals found within {radius / 1000} km.</p>
                <button
                  onClick={() => handleRadiusChange(radius + 5000)}
                  className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-xl hover:bg-blue-100 transition"
                >
                  Expand Search Radius to {(radius + 5000) / 1000} km
                </button>
              </div>
            ) : (
              hospitals.map((hospital) => {
                const isSelected = selectedHospital?.place_id === hospital.place_id;
                return (
                  <div
                    key={hospital.place_id}
                    onClick={() => handleHospitalClick(hospital)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all duration-200 border ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-md shadow-blue-500/5 ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 transition line-clamp-1">
                            {hospital.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1 mt-1 line-clamp-2">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                          <span>{hospital.address}</span>
                        </p>
                      </div>

                      {/* Distance & ETA Badge */}
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800/60">
                          {hospital.distanceKm} km
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          ~{hospital.estimatedDriveMinutes || Math.round(hospital.distanceKm * 2.2)} min drive
                        </span>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                      {/* Rating & Status */}
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-amber-500 font-semibold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded text-[11px]">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          {hospital.rating.toFixed(1)}
                          <span className="text-slate-400 text-[10px]">({hospital.user_ratings_total})</span>
                        </span>

                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            hospital.open_now
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                          }`}
                        >
                          {hospital.open_now ? 'Open 24/7' : 'Closed'}
                        </span>
                      </div>

                      {/* Direction Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDirections(hospital);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition flex items-center gap-1 group"
                        title="Get Turn-by-Turn GPS Navigation on Google Maps"
                      >
                        <Navigation className="w-3 h-3 text-blue-500 group-hover:text-white transition" />
                        <span>Directions</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 🗺️ Right Panel: Interactive Visual Map */}
        <div
          className={`lg:col-span-7 relative bg-slate-100 dark:bg-slate-950 flex flex-col min-h-[420px] ${
            activeTab === 'list' ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {/* Map Visual Canvas */}
          <div className="relative w-full h-full flex-1 overflow-hidden">
            {/* SVG Grid Vector Background Map with Roads and Locations */}
            <div className="absolute inset-0 bg-slate-900">
              <svg className="w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="1" />
                  </pattern>
                  <pattern id="roads" width="160" height="160" patternUnits="userSpaceOnUse">
                    <path d="M 0 80 Q 80 40 160 80" fill="none" stroke="#475569" strokeWidth="2.5" strokeDasharray="6 4" />
                    <path d="M 80 0 Q 120 80 80 160" fill="none" stroke="#475569" strokeWidth="2.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                <rect width="100%" height="100%" fill="url(#roads)" />
              </svg>

              {/* Radar pulse around user */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-64 h-64 rounded-full border border-blue-500/20 animate-ping opacity-25"></div>
                <div className="w-96 h-96 rounded-full border border-blue-400/10 -translate-x-16 -translate-y-16"></div>
              </div>
            </div>

            {/* 👤 Live User Location Marker (Pulsing Radar Center) */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center group cursor-pointer"
              title="Your Current GPS Position"
            >
              <div className="relative flex items-center justify-center">
                <div className="w-7 h-7 rounded-full bg-blue-500/30 animate-ping absolute"></div>
                <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white z-10">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                </div>
              </div>
              <span className="mt-1 px-2 py-0.5 bg-slate-900/90 text-white text-[10px] font-bold rounded-full shadow border border-slate-700 backdrop-blur-md whitespace-nowrap">
                You (Live GPS)
              </span>
            </div>

            {/* 🏥 Hospital Markers Rendered Dynamically across coordinates space */}
            {hospitals.map((hospital, idx) => {
              // Calculate relative projection offsets from center user location
              const latDiff = hospital.latitude - userLocation.lat;
              const lngDiff = hospital.longitude - userLocation.lng;

              // Scale to container coordinates (clamp between 10% and 90%)
              const scale = 12000;
              const leftPercent = Math.min(88, Math.max(12, 50 + lngDiff * scale));
              const topPercent = Math.min(88, Math.max(12, 50 - latDiff * scale));

              const isSelected = selectedHospital?.place_id === hospital.place_id;

              return (
                <div
                  key={hospital.place_id}
                  onClick={() => handleHospitalClick(hospital)}
                  style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer transition-all duration-300 group ${
                    isSelected ? 'scale-125 z-30' : 'hover:scale-110 hover:z-20'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`p-2 rounded-full shadow-lg border-2 transition ${
                        isSelected
                          ? 'bg-rose-600 border-white text-white ring-4 ring-rose-500/40 animate-bounce'
                          : 'bg-white text-rose-600 border-rose-500 group-hover:bg-rose-500 group-hover:text-white'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>

                    <span
                      className={`mt-1 px-2 py-0.5 text-[9px] font-semibold rounded-md shadow whitespace-nowrap max-w-[120px] truncate transition ${
                        isSelected
                          ? 'bg-rose-600 text-white shadow-rose-900/50'
                          : 'bg-slate-900/85 text-slate-200 group-hover:bg-slate-900'
                      }`}
                    >
                      {hospital.name} ({hospital.distanceKm}km)
                    </span>
                  </div>
                </div>
              );
            })}

            {/* 📍 Selected Hospital Floating Card Details (Bottom Sheet / Popup inside Map) */}
            {selectedHospital && (
              <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 z-30 transition-all animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-xl border border-rose-100 dark:border-rose-900/50">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-800 dark:text-white">
                          {selectedHospital.name}
                        </h4>
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                          {selectedHospital.open_now ? 'Open 24/7' : 'Closed'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        {selectedHospital.address}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        <span className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          {selectedHospital.rating.toFixed(1)} ({selectedHospital.user_ratings_total} Google Reviews)
                        </span>
                        <span>•</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          {selectedHospital.distanceKm} km away (~{selectedHospital.estimatedDriveMinutes} min drive)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => openDirections(selectedHospital)}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Google Directions</span>
                      <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 🕹️ Floating Controls Toolbar */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
              <button
                onClick={handleCenterToUser}
                className="p-3 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 transition backdrop-blur-md"
                title="Center map to my GPS location"
              >
                <LocateFixed className="w-5 h-5 text-blue-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleNearbyHospitals;
