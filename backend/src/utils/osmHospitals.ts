import { Role } from '@prisma/client';
import prisma from '../db';

// Auto-created real-world hospitals use this email domain (no one can log in with it)
export const OSM_EMAIL_DOMAIN = '@osm.lifelink.local';

export interface RealHospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  contactNumber: string | null;
  distanceKm: number;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type RawHospital = Omit<RealHospital, 'distanceKm'>;
const cache = new Map<string, { time: number; data: RawHospital[] }>();

// Nearest real hospitals from OpenStreetMap (free, no API key), sorted nearest first
export async function getNearbyRealHospitals(
  lat: number,
  lng: number,
  radiusKm = 20
): Promise<RealHospital[]> {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)},${radiusKm}`;
  let raw: RawHospital[] | null = null;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < 10 * 60 * 1000) {
    raw = cached.data;
  } else {
    try {
      const around = `around:${radiusKm * 1000},${lat},${lng}`;
      const query = `[out:json][timeout:20];(node["amenity"="hospital"](${around});way["amenity"="hospital"](${around}););out center tags;`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'LifeLink-App/1.0',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) throw new Error(`Overpass error ${response.status}`);
      const json = (await response.json()) as any;

      raw = ((json.elements || []) as any[])
        .map((el: any) => {
          const t = el.tags || {};
          const name = t.name || t['name:en'];
          const elLat = el.lat ?? el.center?.lat;
          const elLng = el.lon ?? el.center?.lon;
          if (!name || elLat == null || elLng == null) return null;

          const addr = [
            [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '),
            t['addr:suburb'],
            t['addr:city'],
          ]
            .filter(Boolean)
            .join(', ');

          return {
            id: `osm-${el.type}-${el.id}`,
            name,
            address: addr || 'Address not listed',
            lat: elLat,
            lng: elLng,
            contactNumber: t.phone || t['contact:phone'] || null,
          } as RawHospital;
        })
        .filter(Boolean) as RawHospital[];

      cache.set(cacheKey, { time: Date.now(), data: raw });
    } catch (err: any) {
      console.error('[OSM] Failed to fetch real hospitals:', err?.message || err);
      return [];
    }
  }

  return raw!
    .map((h) => ({ ...h, distanceKm: haversineKm(lat, lng, h.lat, h.lng) }))
    .filter((h) => h.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

// Save a real hospital in our database (so an emergency request can point to it).
// It gets a locked admin account that nobody can log in with.
export async function getOrCreateRealHospital(h: RealHospital) {
  const email = `${h.id}${OSM_EMAIL_DOMAIN}`;

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { hospital: true },
  });
  if (existing?.hospital) return existing.hospital;

  let user = existing;
  if (!user) {
    try {
      user = (await prisma.user.create({
        data: {
          name: h.name,
          email,
          passwordHash: 'LOCKED_NO_LOGIN',
          role: Role.ADMIN_HOSPITAL,
          isActive: false,
        },
        include: { hospital: true },
      })) as any;
    } catch (err) {
      // Another SOS may have created it at the same time
      user = await prisma.user.findUnique({ where: { email }, include: { hospital: true } });
      if (user?.hospital) return user.hospital;
    }
  }

  return prisma.hospital.create({
    data: {
      name: h.name,
      address: h.address,
      contactNumber: h.contactNumber || 'Not listed',
      lat: h.lat,
      lng: h.lng,
      adminUserId: user!.id,
      availableBeds: 0,
    },
  });
}