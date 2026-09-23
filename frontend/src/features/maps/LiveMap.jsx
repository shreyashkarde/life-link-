import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Custom Leaflet HTML DivIcons with clean badges and glyphs
 */
const createAmbulanceIcon = (driverName, vehicleNumber) => {
  return L.divIcon({
    className: 'custom-leaflet-ambulance',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 10px 20px -5px rgba(239, 68, 68, 0.5), 0 0 0 2.5px white;
          color: white;
          position: relative;
        ">
          🚑
          <span style="
            position: absolute;
            top: -2px;
            right: -2px;
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background-color: #10b981;
            border: 2px solid white;
          "></span>
        </div>
        <div style="
          margin-top: 3px;
          background: rgba(15, 23, 42, 0.85);
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 1.5px 7px;
          border-radius: 9999px;
          white-space: nowrap;
          box-shadow: 0 4px 6px rgba(0,0,0,0.15);
          border: 1px solid rgba(255,255,255,0.2);
        ">
          ${vehicleNumber || 'Ambulance'}
        </div>
      </div>
    `,
    iconSize: [42, 62],
    iconAnchor: [21, 30],
  });
};

const createPickupIcon = () => {
  return L.divIcon({
    className: 'custom-leaflet-pickup',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.5), 0 0 0 2.5px white;
          color: white;
        ">
          📍
        </div>
        <div style="
          margin-top: 3px;
          background: rgba(15, 23, 42, 0.85);
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 1.5px 7px;
          border-radius: 9999px;
          white-space: nowrap;
          box-shadow: 0 4px 6px rgba(0,0,0,0.15);
          border: 1px solid rgba(255,255,255,0.2);
        ">
          Pickup Point
        </div>
      </div>
    `,
    iconSize: [40, 60],
    iconAnchor: [20, 29],
  });
};

/**
 * Auto-fit bounds for Leaflet map to frame both driver & patient
 */
const LeafletBoundsFitter = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const valid = points.filter(
      (p) => typeof p[0] === 'number' && typeof p[1] === 'number' && !isNaN(p[0]) && !isNaN(p[1])
    );
    if (valid.length === 1) {
      map.panTo(valid[0]);
    } else if (valid.length > 1) {
      const bounds = L.latLngBounds(valid);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    }
  }, [points, map]);

  return null;
};

/**
 * 🗺️ LiveMap Component
 * Clean, real-world live tracking map:
 * - Real map tiles with streets, buildings, zoom/pan
 * - Real-time Ambulance 🚑 and Patient 📍 markers
 * - Dynamic route polyline connecting driver to destination
 * - Clean, non-intrusive live GPS telemetry pill
 * - Zero popups, zero modals, zero cluttered switcher buttons
 */
export const LiveMap = ({
  latitude = null,
  longitude = null,
  pickupLat = null,
  pickupLng = null,
  driverName = 'Paramedic Unit',
  vehicleNumber = 'MH-01-EQ-1108',
  status = 'EN_ROUTE',
  height = '360px',
  zoom = 15,
  showRoute = true,
}) => {
  const envKey = (import.meta.env.VITE_MAP_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const [googleSdkLoaded, setGoogleSdkLoaded] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState(false);

  const googleMapContainerRef = useRef(null);
  const googleMapInstanceRef = useRef(null);
  const googleDriverMarkerRef = useRef(null);
  const googlePickupMarkerRef = useRef(null);
  const googlePolylineRef = useRef(null);

  // Dynamic distance calculation
  const distanceKm = useMemo(() => {
    if (latitude && longitude && pickupLat && pickupLng) {
      const dLat = (pickupLat - latitude) * 111;
      const dLng = (pickupLng - longitude) * 111 * Math.cos((latitude * Math.PI) / 180);
      return Math.sqrt(dLat * dLat + dLng * dLng).toFixed(2);
    }
    return null;
  }, [latitude, longitude, pickupLat, pickupLng]);

  // Google Maps SDK Loader (callback-based, zero console warnings)
  useEffect(() => {
    if (!envKey) return;

    const handleAuthFailure = () => {
      setGoogleAuthError(true);
      setGoogleSdkLoaded(false);
    };
    window.gm_authFailure = handleAuthFailure;

    if (window.google && window.google.maps && typeof window.google.maps.Map === 'function') {
      setGoogleSdkLoaded(true);
      return;
    }

    window.__initGoogleMapsCallback = () => {
      if (window.google?.maps && typeof window.google.maps.Map === 'function') {
        setGoogleSdkLoaded(true);
      } else {
        setGoogleAuthError(true);
      }
    };

    const scriptId = 'google-maps-api-script';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(envKey)}&libraries=geometry&callback=__initGoogleMapsCallback`;
      script.async = true;
      script.defer = true;
      script.onerror = () => setGoogleAuthError(true);
      document.head.appendChild(script);
    } else if (window.google?.maps) {
      setGoogleSdkLoaded(true);
    }
  }, [envKey]);

  // Google Maps Instance (only when valid envKey is provided & Map is a constructor)
  const useGoogle = Boolean(
    envKey &&
      googleSdkLoaded &&
      !googleAuthError &&
      typeof window.google?.maps?.Map === 'function'
  );

  useEffect(() => {
    if (
      !useGoogle ||
      !googleMapContainerRef.current ||
      !latitude ||
      !longitude ||
      typeof window.google?.maps?.Map !== 'function'
    ) {
      return;
    }

    try {
      const currentPos = { lat: latitude, lng: longitude };

      if (!googleMapInstanceRef.current) {
        googleMapInstanceRef.current = new window.google.maps.Map(googleMapContainerRef.current, {
          center: currentPos,
          zoom: zoom,
          mapTypeId: 'roadmap',
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });
      }

      const map = googleMapInstanceRef.current;
      if (!map) return;

      if (!googleDriverMarkerRef.current && typeof window.google?.maps?.Marker === 'function') {
        googleDriverMarkerRef.current = new window.google.maps.Marker({
          position: currentPos,
          map: map,
          title: `${driverName} (${vehicleNumber})`,
          icon: {
            url: 'https://cdn-icons-png.flaticon.com/512/2869/2869408.png',
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20),
          },
        });
      } else if (googleDriverMarkerRef.current && typeof googleDriverMarkerRef.current.setPosition === 'function') {
        googleDriverMarkerRef.current.setPosition(currentPos);
      }

      if (pickupLat && pickupLng) {
        const pickupPos = { lat: pickupLat, lng: pickupLng };
        if (!googlePickupMarkerRef.current && typeof window.google?.maps?.Marker === 'function') {
          googlePickupMarkerRef.current = new window.google.maps.Marker({
            position: pickupPos,
            map: map,
            title: 'Patient Pickup Point',
            icon: {
              url: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
              scaledSize: new window.google.maps.Size(36, 36),
              anchor: new window.google.maps.Point(18, 36),
            },
          });
        } else if (googlePickupMarkerRef.current && typeof googlePickupMarkerRef.current.setPosition === 'function') {
          googlePickupMarkerRef.current.setPosition(pickupPos);
        }

        if (showRoute && typeof window.google?.maps?.Polyline === 'function') {
          const routePath = [currentPos, pickupPos];
          if (!googlePolylineRef.current) {
            googlePolylineRef.current = new window.google.maps.Polyline({
              path: routePath,
              geodesic: true,
              strokeColor: '#2563EB',
              strokeOpacity: 0.85,
              strokeWeight: 4,
              map: map,
            });
          } else if (googlePolylineRef.current && typeof googlePolylineRef.current.setPath === 'function') {
            googlePolylineRef.current.setPath(routePath);
          }
        }

        if (typeof window.google?.maps?.LatLngBounds === 'function') {
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(currentPos);
          bounds.extend(pickupPos);
          map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        }
      } else if (typeof map.panTo === 'function') {
        map.panTo(currentPos);
      }
    } catch {
      setGoogleAuthError(true);
    }
  }, [useGoogle, latitude, longitude, pickupLat, pickupLng, driverName, vehicleNumber, zoom, showRoute]);

  // Leaflet Coordinates
  const validLat = latitude || 19.0522;
  const validLng = longitude || 72.8295;
  const defaultCenter = [validLat, validLng];

  const leafletRoutePoints = useMemo(() => {
    const pts = [];
    if (latitude && longitude) pts.push([latitude, longitude]);
    if (pickupLat && pickupLng) pts.push([pickupLat, pickupLng]);
    return pts;
  }, [latitude, longitude, pickupLat, pickupLng]);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-sm border border-gray-200" style={{ height }}>
      {/* 🟢 Clean, Non-Intrusive Live Telemetry Pill */}
      <div className="absolute top-2.5 left-2.5 z-[500] pointer-events-none flex items-center gap-2 bg-slate-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-xs shadow-md">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span className="font-bold text-gray-200">Live GPS Tracking</span>
        <span className="text-gray-400">•</span>
        <span className="font-mono text-blue-300 text-[11px]">
          {validLat.toFixed(4)}, {validLng.toFixed(4)}
        </span>
        {distanceKm && (
          <span className="text-emerald-300 font-semibold text-[11px] hidden sm:inline">
            • {distanceKm} km away
          </span>
        )}
      </div>

      {/* Render Google Maps (if env key active) OR Real Street Map (Leaflet) */}
      {useGoogle ? (
        <div ref={googleMapContainerRef} className="w-full h-full" />
      ) : (
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

          {/* Auto-fit bounds framing ambulance and pickup */}
          <LeafletBoundsFitter points={leafletRoutePoints} />

          {/* Dynamic route polyline */}
          {showRoute && leafletRoutePoints.length >= 2 && (
            <Polyline
              positions={leafletRoutePoints}
              color="#2563EB"
              weight={4}
              opacity={0.85}
              dashArray="8, 6"
            />
          )}

          {/* Ambulance Marker */}
          {latitude && longitude && (
            <Marker
              position={[latitude, longitude]}
              icon={createAmbulanceIcon(driverName, vehicleNumber)}
            >
              <Popup>
                <div className="text-xs p-1">
                  <p className="font-bold text-red-600">🚑 {driverName}</p>
                  <p className="text-gray-600 font-mono">{vehicleNumber}</p>
                  <p className="text-emerald-600 font-semibold mt-1">Status: {status}</p>
                  {distanceKm && <p className="text-blue-600">{distanceKm} km to pickup</p>}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Patient Pickup Marker */}
          {pickupLat && pickupLng && (
            <Marker
              position={[pickupLat, pickupLng]}
              icon={createPickupIcon()}
            >
              <Popup>
                <div className="text-xs p-1">
                  <p className="font-bold text-blue-600">📍 Patient Pickup Location</p>
                  <p className="text-gray-600 font-mono">
                    {pickupLat.toFixed(4)}, {pickupLng.toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      )}
    </div>
  );
};

export default LiveMap;
