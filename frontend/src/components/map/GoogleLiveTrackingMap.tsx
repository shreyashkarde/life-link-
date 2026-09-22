import React, { useEffect, useRef, useState } from 'react';
import {
  Navigation,
  Compass,
  Layers,
  MapPin,
  Building2,
  Gauge,
  Key,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Locate,
  Radio,
} from 'lucide-react';
import { LiveTrackingMap as LeafletFallbackMap } from './LiveTrackingMap';

interface LocationCoord {
  lat: number;
  lng: number;
  address?: string;
  name?: string;
}

interface GoogleLiveTrackingMapProps {
  driverLocation?: { lat: number; lng: number; heading?: number; speed?: number };
  pickupLocation?: LocationCoord;
  hospitalLocation?: LocationCoord;
  height?: string;
  zoom?: number;
  onDeviceLocationUpdate?: (lat: number, lng: number) => void;
  enableDeviceGPS?: boolean;
}

declare global {
  interface Window {
    google: any;
    initGoogleMapCallback: () => void;
  }
}

export const GoogleLiveTrackingMap: React.FC<GoogleLiveTrackingMapProps> = ({
  driverLocation,
  pickupLocation,
  hospitalLocation,
  height = '500px',
  zoom = 14,
  onDeviceLocationUpdate,
  enableDeviceGPS = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const pickupMarkerRef = useRef<any>(null);
  const hospitalMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const trafficLayerRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  // Key state: check env or localStorage
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('lifelink_google_maps_key') || envKey;
  });
  const [tempKeyInput, setTempKeyInput] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Map state
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [useFallbackMap, setUseFallbackMap] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [trafficEnabled, setTrafficEnabled] = useState(false);
  const [isTrackingDevice, setIsTrackingDevice] = useState(false);
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Save API Key
  const handleSaveApiKey = () => {
    if (tempKeyInput.trim()) {
      localStorage.setItem('lifelink_google_maps_key', tempKeyInput.trim());
      setApiKey(tempKeyInput.trim());
      setShowKeyModal(false);
      setUseFallbackMap(false);
      setLoadError(false);
      window.location.reload();
    }
  };

  // 1. Google Maps Script Loader
  useEffect(() => {
    if (useFallbackMap) return;

    // Check if google maps is already loaded
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    if (!apiKey) {
      // No key provided, default to fallback or allow key entry
      setUseFallbackMap(true);
      return;
    }

    // Handle authentication error callback from Google Maps
    (window as any).gm_authFailure = () => {
      console.warn('[Google Maps] Authentication failed. Falling back to OpenStreetMap.');
      setLoadError(true);
      setUseFallbackMap(true);
    };

    const scriptId = 'google-maps-script-lifelink';
    let existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        setMapLoaded(true);
        setLoadError(false);
      };

      script.onerror = () => {
        console.error('[Google Maps] Script failed to load.');
        setLoadError(true);
        setUseFallbackMap(true);
      };

      document.head.appendChild(script);
    } else {
      if (window.google && window.google.maps) {
        setMapLoaded(true);
      }
    }
  }, [apiKey, useFallbackMap]);

  // 2. Initialize Google Map Instance
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || !window.google?.maps || useFallbackMap) {
      return;
    }

    const defaultCenter = {
      lat: driverLocation?.lat || pickupLocation?.lat || 19.076,
      lng: driverLocation?.lng || pickupLocation?.lng || 72.8777,
    };

    try {
      // Modern Custom Map Styles (Executive Clinical Silver)
      const mapStyles = [
        {
          featureType: 'all',
          elementType: 'geometry',
          stylers: [{ color: '#f5f7fa' }],
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#c9d9f5' }],
        },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#ffffff' }],
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry',
          stylers: [{ color: '#d9e4fa' }],
        },
        {
          featureType: 'poi.medical',
          elementType: 'geometry',
          stylers: [{ color: '#ffeaec' }],
        },
        {
          featureType: 'poi.medical',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#e11d48' }],
        },
      ];

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: defaultCenter,
        zoom,
        mapTypeId: mapType,
        styles: mapType === 'roadmap' ? mapStyles : undefined,
        fullscreenControl: true,
        streetViewControl: false,
        zoomControl: true,
        mapTypeControl: false,
      });

      mapInstanceRef.current = map;

      // Traffic layer instance
      trafficLayerRef.current = new window.google.maps.TrafficLayer();

      // Ambulance SVG Icon with dynamic rotation heading
      const createAmbulanceIcon = (heading: number = 0) => ({
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#2563EB',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        rotation: heading,
      });

      // Markers Setup
      if (driverLocation) {
        driverMarkerRef.current = new window.google.maps.Marker({
          position: { lat: driverLocation.lat, lng: driverLocation.lng },
          map,
          title: 'Live Ambulance Dispatch',
          icon: createAmbulanceIcon(driverLocation.heading || 0),
          zIndex: 99,
        });
      }

      if (pickupLocation) {
        pickupMarkerRef.current = new window.google.maps.Marker({
          position: { lat: pickupLocation.lat, lng: pickupLocation.lng },
          map,
          title: pickupLocation.address || 'Patient Pickup Location',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#E11D48',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
          },
        });
      }

      if (hospitalLocation) {
        hospitalMarkerRef.current = new window.google.maps.Marker({
          position: { lat: hospitalLocation.lat, lng: hospitalLocation.lng },
          map,
          title: hospitalLocation.name || 'Trauma Emergency Hospital',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#059669',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
          },
        });
      }

      // Polyline route
      const pathCoordinates: any[] = [];
      if (driverLocation) pathCoordinates.push({ lat: driverLocation.lat, lng: driverLocation.lng });
      if (pickupLocation) pathCoordinates.push({ lat: pickupLocation.lat, lng: pickupLocation.lng });
      if (hospitalLocation) pathCoordinates.push({ lat: hospitalLocation.lat, lng: hospitalLocation.lng });

      polylineRef.current = new window.google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#2563EB',
        strokeOpacity: 0.85,
        strokeWeight: 4,
        map,
      });

      // Fit bounds
      if (pathCoordinates.length > 1) {
        const bounds = new window.google.maps.LatLngBounds();
        pathCoordinates.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, 60);
      }
    } catch (err) {
      console.error('[Google Maps] Error initializing map:', err);
      setUseFallbackMap(true);
    }
  }, [mapLoaded, useFallbackMap]);

  // 3. Smooth Real-Time Location Updates
  useEffect(() => {
    if (!mapLoaded || !driverMarkerRef.current || !driverLocation || useFallbackMap) return;

    const newPos = { lat: driverLocation.lat, lng: driverLocation.lng };

    // Update marker position
    driverMarkerRef.current.setPosition(newPos);

    // Update heading rotation if available
    if (window.google?.maps && typeof driverLocation.heading === 'number') {
      driverMarkerRef.current.setIcon({
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#2563EB',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        rotation: driverLocation.heading,
      });
    }

    // Update polyline route in real time
    if (polylineRef.current) {
      const path = polylineRef.current.getPath();
      if (path && path.getLength() > 0) {
        path.setAt(0, new window.google.maps.LatLng(newPos.lat, newPos.lng));
      }
    }

    // Pan camera smoothly
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(newPos);
    }
  }, [driverLocation, mapLoaded, useFallbackMap]);

  // 4. Toggle Traffic Layer
  const toggleTraffic = () => {
    if (!mapInstanceRef.current || !trafficLayerRef.current) return;
    if (trafficEnabled) {
      trafficLayerRef.current.setMap(null);
      setTrafficEnabled(false);
    } else {
      trafficLayerRef.current.setMap(mapInstanceRef.current);
      setTrafficEnabled(true);
    }
  };

  // 5. Change Map Type
  const handleMapTypeChange = (type: 'roadmap' | 'satellite' | 'hybrid') => {
    setMapType(type);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(type);
    }
  };

  // 6. Device Real GPS Tracking Mode (HTML5 Geolocation)
  const toggleDeviceGPS = () => {
    if (isTrackingDevice) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTrackingDevice(false);
    } else {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }

      setIsTrackingDevice(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setDeviceCoords(coords);
          if (onDeviceLocationUpdate) {
            onDeviceLocationUpdate(coords.lat, coords.lng);
          }
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo(coords);
          }
        },
        (err) => console.warn('Device GPS tracking error:', err),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
      );
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // If using fallback map (OpenStreetMap Leaflet)
  if (useFallbackMap) {
    return (
      <div className="relative w-full rounded-3xl overflow-hidden shadow-luxury border border-surface-200/80">
        {/* Fallback Banner & Switcher */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between p-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-surface-200/80 text-xs shadow-soft">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="font-bold text-surface-800">
              Active Map Engine: <span className="text-blue-600">OpenStreetMap Live Vector</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition-all border border-blue-200"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Connect Google Maps API Key</span>
            </button>
            <button
              onClick={() => {
                setUseFallbackMap(false);
                setMapLoaded(false);
              }}
              className="px-2.5 py-1 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold text-[11px]"
            >
              Try Google Map
            </button>
          </div>
        </div>

        <LeafletFallbackMap
          driverLocation={driverLocation}
          pickupLocation={pickupLocation}
          hospitalLocation={hospitalLocation}
          height={height}
          zoom={zoom}
        />

        {/* Modal to configure Google Maps API Key */}
        {showKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/70 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-surface-200/80 shadow-luxury space-y-4 text-left">
              <div className="flex items-center gap-2 text-blue-600 font-black text-base">
                <Key className="w-5 h-5" />
                <span>Configure Google Maps API Key</span>
              </div>
              <p className="text-xs text-surface-600 leading-relaxed font-medium">
                Enter your Google Maps JavaScript API key to enable Google Roadmaps, Satellite View, Live Traffic, and Street View.
              </p>
              <div>
                <label htmlFor="gmaps-key-input" className="block text-xs font-bold text-surface-700 mb-1">
                  Google Maps API Key
                </label>
                <input
                  id="gmaps-key-input"
                  name="gmapsApiKey"
                  type="text"
                  value={tempKeyInput}
                  onChange={(e) => setTempKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-mono text-surface-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-glow-blue"
                >
                  Save & Enable Google Maps
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Google Map Rendering
  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-luxury border border-surface-200/80 group" style={{ height }}>
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Map Type Switcher */}
          <div className="flex items-center p-1 rounded-2xl bg-white/95 backdrop-blur-md border border-surface-200/80 shadow-soft text-xs font-bold text-surface-700">
            <button
              onClick={() => handleMapTypeChange('roadmap')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                mapType === 'roadmap' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-surface-100'
              }`}
            >
              Google Map
            </button>
            <button
              onClick={() => handleMapTypeChange('satellite')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                mapType === 'satellite' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-surface-100'
              }`}
            >
              Satellite
            </button>
          </div>

          {/* Traffic Toggle */}
          <button
            onClick={toggleTraffic}
            className={`pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-2xl backdrop-blur-md border text-xs font-bold transition-all shadow-soft ${
              trafficEnabled
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-white/95 text-surface-700 border-surface-200/80 hover:bg-surface-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Traffic</span>
          </button>
        </div>

        {/* Right Action: Device Real GPS & Fallback Toggle */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Follow Device GPS button */}
          <button
            onClick={toggleDeviceGPS}
            title="Track my real-world phone/laptop location"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl backdrop-blur-md border text-xs font-bold transition-all shadow-soft ${
              isTrackingDevice
                ? 'bg-rose-600 text-white border-rose-500 shadow-glow-rose animate-pulse'
                : 'bg-white/95 text-surface-700 border-surface-200/80 hover:bg-surface-50'
            }`}
          >
            <Locate className="w-3.5 h-3.5" />
            <span>{isTrackingDevice ? 'Tracking Real GPS' : 'Follow Device GPS'}</span>
          </button>

          {/* Switch to Leaflet fallback */}
          <button
            onClick={() => setUseFallbackMap(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-surface-200/80 text-surface-700 hover:text-blue-600 text-xs font-bold shadow-soft"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>OpenStreetMap</span>
          </button>
        </div>
      </div>

      {/* Bottom Live Telemetry Pill */}
      {driverLocation && (
        <div className="absolute bottom-3 left-3 z-20 pointer-events-auto flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-surface-900/90 backdrop-blur-xl text-white border border-white/10 text-xs font-mono shadow-luxury">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Google Maps Real-Time Telemetry</span>
          </div>
          <span className="text-slate-500">|</span>
          <span>Lat: {driverLocation.lat.toFixed(4)}</span>
          <span>Lng: {driverLocation.lng.toFixed(4)}</span>
          {typeof driverLocation.speed === 'number' && (
            <span className="text-emerald-400 font-bold">{driverLocation.speed} km/h</span>
          )}
        </div>
      )}

      {/* Google Maps Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
