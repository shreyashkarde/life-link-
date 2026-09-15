import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Compass } from 'lucide-react';

interface LeafletMapProps {
  patientLoc?: [number, number] | null;
  driverLoc?: [number, number] | null;
  hospitalLoc?: [number, number] | null;
  status?: string;
  zoom?: number;
  nearbyDrivers?: { currentLat: number; currentLng: number; vehicleNumber: string; driver?: { name: string } }[];
  mapboxToken?: string;
  profile?: 'mapbox/driving' | 'mapbox/driving-traffic' | 'mapbox/walking' | 'mapbox/cycling';
}

interface RouteStats {
  distanceKm: string;
  durationMins: number;
  provider: string;
  nextInstruction?: string;
  summary?: string;
}

// Custom Leaflet DivIcons for rich real-world rendering
const createPatientIcon = () =>
  L.divIcon({
    className: 'custom-patient-icon',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
        <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(239, 68, 68, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; background: #ef4444; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(239,68,68,0.6); display: flex; align-items: center; justify-content: center; color: white; font-size: 13px;">
          📍
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });

const createDriverIcon = (vehicleNumber?: string) =>
  L.divIcon({
    className: 'custom-driver-icon',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="width: 36px; height: 36px; border-radius: 10px; background: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(37,99,235,0.6); display: flex; align-items: center; justify-content: center; font-size: 18px;">
          🚑
        </div>
        ${
          vehicleNumber
            ? `<div style="background: rgba(15,23,42,0.92); color: #93c5fd; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 6px; margin-top: 2px; border: 1px solid rgba(59,130,246,0.4); white-space: nowrap;">${vehicleNumber}</div>`
            : ''
        }
      </div>
    `,
    iconSize: [36, 52],
    iconAnchor: [18, 26],
    popupAnchor: [0, -26],
  });

const createHospitalIcon = () =>
  L.divIcon({
    className: 'custom-hospital-icon',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="width: 38px; height: 38px; border-radius: 10px; background: #059669; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(5,150,105,0.6); display: flex; align-items: center; justify-content: center; font-size: 19px;">
          🏥
        </div>
        <div style="background: rgba(15,23,42,0.92); color: #6ee7b7; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 6px; margin-top: 2px; border: 1px solid rgba(16,185,129,0.4); white-space: nowrap;">Hospital ER</div>
      </div>
    `,
    iconSize: [38, 54],
    iconAnchor: [19, 27],
    popupAnchor: [0, -27],
  });

export const LeafletMap: React.FC<LeafletMapProps> = ({
  patientLoc,
  driverLoc,
  hospitalLoc,
  status,
  zoom = 14,
  nearbyDrivers = [],
  mapboxToken,
  profile = 'mapbox/driving',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Layer[]>([]);
  const polylineLayersRef = useRef<L.Polyline[]>([]);
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null);

  // Read Mapbox token purely from env or props (no prompt/modal in UI)
  const activeToken = mapboxToken || import.meta.env.VITE_MAPBOX_TOKEN || '';

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;

    const initialCenter: [number, number] =
      patientLoc && patientLoc[0] ? [patientLoc[0], patientLoc[1]] : [37.7749, -122.4194];

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(initialCenter, zoom);

    // Dark matter premium tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update center when patientLoc changes on initial detect
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !patientLoc || !patientLoc[0] || !patientLoc[1]) return;
    if (!driverLoc && !hospitalLoc && nearbyDrivers.length === 0) {
      map.setView([patientLoc[0], patientLoc[1]], zoom, { animate: true });
    }
  }, [patientLoc?.[0], patientLoc?.[1]]);

  // Sync markers and real-time turn-by-turn routes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers from map
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Clear old polylines
    polylineLayersRef.current.forEach((layer) => layer.remove());
    polylineLayersRef.current = [];

    const boundsPoints: L.LatLngExpression[] = [];

    // 1. Patient Marker (Pulsing GPS Pin)
    if (patientLoc && patientLoc[0] && patientLoc[1]) {
      const patientMarker = L.marker([patientLoc[0], patientLoc[1]], {
        icon: createPatientIcon(),
      }).addTo(map).bindPopup('<b>Patient Emergency Location</b><br/>Real-time GPS coordinates');

      markersRef.current.push(patientMarker);
      boundsPoints.push([patientLoc[0], patientLoc[1]]);
    }

    // 2. Hospital Marker (Emergency Medical Center)
    if (hospitalLoc && hospitalLoc[0] && hospitalLoc[1]) {
      const hospitalMarker = L.marker([hospitalLoc[0], hospitalLoc[1]], {
        icon: createHospitalIcon(),
      }).addTo(map).bindPopup('<b>Receiving Hospital ER</b><br/>Trauma & Emergency Care Center');

      markersRef.current.push(hospitalMarker);
      boundsPoints.push([hospitalLoc[0], hospitalLoc[1]]);
    }

    // 3. Assigned Driver Marker (Live Ambulance)
    if (driverLoc && driverLoc[0] && driverLoc[1]) {
      const driverMarker = L.marker([driverLoc[0], driverLoc[1]], {
        icon: createDriverIcon('Active Rig'),
      }).addTo(map).bindPopup('<b>Assigned Emergency Ambulance</b><br/>Transmitting live telemetry');

      markersRef.current.push(driverMarker);
      boundsPoints.push([driverLoc[0], driverLoc[1]]);
    }

    // 4. Nearby Available Drivers
    nearbyDrivers.forEach((amb) => {
      // Don't duplicate assigned driver
      if (
        driverLoc &&
        Math.abs(amb.currentLat - driverLoc[0]) < 0.0001 &&
        Math.abs(amb.currentLng - driverLoc[1]) < 0.0001
      ) {
        return;
      }

      const ambMarker = L.marker([amb.currentLat, amb.currentLng], {
        icon: createDriverIcon(amb.vehicleNumber),
      }).addTo(map).bindPopup(`<b>Available Ambulance:</b> ${amb.vehicleNumber}`);

      markersRef.current.push(ambMarker);
      boundsPoints.push([amb.currentLat, amb.currentLng]);
    });

    // Auto-fit bounds when multiple landmarks exist
    if (boundsPoints.length > 1) {
      try {
        map.fitBounds(L.latLngBounds(boundsPoints), {
          padding: [50, 50],
          maxZoom: 16,
          animate: true,
        });
      } catch (e) {
        // Fallback
      }
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], zoom, { animate: true });
    }

    // 5. Calculate Real-Time Driving Route & Direction Polyline
    const fetchDirectionsRoute = async () => {
      let start: [number, number] | null = null;
      let end: [number, number] | null = null;

      if (driverLoc && patientLoc && (!status || status === 'ACCEPTED' || status === 'ARRIVING')) {
        start = driverLoc;
        end = patientLoc;
      } else if (patientLoc && hospitalLoc && status === 'IN_TRANSIT') {
        start = patientLoc;
        end = hospitalLoc;
      } else if (driverLoc && hospitalLoc && (status === 'AT_HOSPITAL' || status === 'COMPLETED')) {
        start = driverLoc;
        end = hospitalLoc;
      } else if (patientLoc && nearbyDrivers.length > 0) {
        // Live Radar Direction preview to closest available ambulance
        start = [nearbyDrivers[0].currentLat, nearbyDrivers[0].currentLng];
        end = patientLoc;
      }

      if (!start || !end || !start[0] || !start[1] || !end[0] || !end[1]) {
        setRouteStats(null);
        return;
      }

      const startLng = start[1];
      const startLat = start[0];
      const endLng = end[1];
      const endLat = end[0];
      const coordinates = `${startLng},${startLat};${endLng},${endLat}`;

      let routeLoaded = false;

      // Strategy 1: Mapbox Directions API v5 (https://api.mapbox.com/directions/v5/{profile}/{coordinates})
      if (activeToken && activeToken.trim().length > 0) {
        try {
          const mapboxUrl = `https://api.mapbox.com/directions/v5/${profile}/${coordinates}?geometries=geojson&overview=full&steps=true&access_token=${activeToken.trim()}`;
          const response = await fetch(mapboxUrl);

          if (response.ok) {
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              const rawCoords = route.geometry.coordinates;
              const latLngs = rawCoords.map((c: [number, number]) => L.latLng(c[1], c[0]));

              const casing = L.polyline(latLngs, {
                color: '#0284c7',
                weight: 6,
                opacity: 0.45,
                lineJoin: 'round',
                lineCap: 'round',
              }).addTo(map);

              const core = L.polyline(latLngs, {
                color: '#38bdf8',
                weight: 3.5,
                opacity: 0.95,
                lineJoin: 'round',
                lineCap: 'round',
              }).addTo(map);

              polylineLayersRef.current = [casing, core];

              const dist = route.distance;
              const dur = route.duration;
              const firstStep = route.legs?.[0]?.steps?.[0];
              const nextInstruction = firstStep?.maneuver?.instruction || '';
              const summary = route.legs?.[0]?.summary || '';

              setRouteStats({
                distanceKm: (dist / 1000).toFixed(1),
                durationMins: Math.max(1, Math.round(dur / 60)),
                provider: 'Mapbox Directions v5',
                nextInstruction,
                summary,
              });
              routeLoaded = true;
            }
          }
        } catch (err) {
          // Silent fallback to OSRM
        }
      }

      // Strategy 2: OSRM OpenStreetMap Engine (Default Seamless Fallback)
      if (!routeLoaded) {
        try {
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinates}?geometries=geojson&overview=full&steps=true`;
          const response = await fetch(osrmUrl);
          const data = await response.json();

          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const rawCoords = route.geometry.coordinates;
            const latLngs = rawCoords.map((c: [number, number]) => L.latLng(c[1], c[0]));

            const casing = L.polyline(latLngs, {
              color: '#1d4ed8',
              weight: 6,
              opacity: 0.4,
              lineJoin: 'round',
              lineCap: 'round',
            }).addTo(map);

            const core = L.polyline(latLngs, {
              color: '#60a5fa',
              weight: 3.5,
              opacity: 0.95,
              lineJoin: 'round',
              lineCap: 'round',
            }).addTo(map);

            polylineLayersRef.current = [casing, core];

            const dist = route.distance;
            const dur = route.duration;
            const summary = route.legs?.[0]?.summary || '';

            setRouteStats({
              distanceKm: (dist / 1000).toFixed(1),
              durationMins: Math.max(1, Math.round(dur / 60)),
              provider: 'GPS Road Routing',
              summary,
            });
            routeLoaded = true;
          }
        } catch (err) {
          // Continue to fallback interpolation
        }
      }

      // Strategy 3: Dynamic Interpolated Road Trajectory if offline
      if (!routeLoaded) {
        const steps = 30;
        const latLngs: L.LatLng[] = [];
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const curveOffset = Math.sin(t * Math.PI) * 0.0015;
          const curLat = startLat + (endLat - startLat) * t + curveOffset;
          const curLng = startLng + (endLng - startLng) * t;
          latLngs.push(L.latLng(curLat, curLng));
        }

        const polyline = L.polyline(latLngs, {
          color: '#38bdf8',
          weight: 4,
          opacity: 0.9,
          dashArray: '8, 8',
        }).addTo(map);

        polylineLayersRef.current = [polyline];

        const directDistKm = Math.sqrt(
          Math.pow((endLat - startLat) * 111, 2) +
          Math.pow((endLng - startLng) * 111 * Math.cos(startLat * (Math.PI / 180)), 2)
        );

        setRouteStats({
          distanceKm: directDistKm.toFixed(1),
          durationMins: Math.max(2, Math.round(directDistKm * 2)),
          provider: 'Emergency Transit Path',
        });
      }
    };

    fetchDirectionsRoute();
  }, [
    patientLoc?.[0],
    patientLoc?.[1],
    driverLoc?.[0],
    driverLoc?.[1],
    hospitalLoc?.[0],
    hospitalLoc?.[1],
    status,
    nearbyDrivers.length,
    activeToken,
    profile,
  ]);

  return (
    <div className="w-full h-full min-h-[350px] relative overflow-hidden rounded-2xl shadow-inner border border-gray-200 dark:border-gray-800 bg-slate-950 select-none">
      <div ref={mapRef} className="w-full h-full min-h-[350px] z-0" />

      {/* Navigation & Direction HUD */}
      {routeStats && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 bg-slate-900/95 border border-slate-800 text-white p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl backdrop-blur-md z-10 animate-fade-in max-w-lg">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Navigation className="w-4 h-4 animate-pulse" />
            </div>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider truncate">
                  {status === 'IN_TRANSIT'
                    ? 'Heading to ER Hospital'
                    : status === 'ACCEPTED' || status === 'ARRIVING'
                    ? 'Ambulance En Route to You'
                    : 'Nearest Emergency Unit'}
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                  {routeStats.provider}
                </span>
              </div>
              {routeStats.nextInstruction ? (
                <p className="text-xs font-bold text-slate-100 flex items-center gap-1 mt-0.5 truncate">
                  <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{routeStats.nextInstruction}</span>
                </p>
              ) : (
                <p className="text-xs font-bold text-slate-200 mt-0.5 truncate">
                  {routeStats.summary ? `Via ${routeStats.summary}` : 'Live Real-Time GPS Directions'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-right shrink-0 self-end sm:self-center">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Distance</span>
              <span className="text-xs font-extrabold text-cyan-400">{routeStats.distanceKm} km</span>
            </div>
            <div className="border-l border-slate-800 h-6" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">ETA</span>
              <span className="text-xs font-extrabold text-emerald-400">{routeStats.durationMins} mins</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeafletMap;
