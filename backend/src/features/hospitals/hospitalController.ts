import { Request, Response } from 'express';

// Haversine formula distance calculation in kilometers
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

// Verified Single Hospital Database for LifeLink (Strict 1-to-1 Entity Model)
const HOSPITALS_DATABASE = [
  {
    id: 'hosp_lilavati',
    name: 'Lilavati Hospital & Research Centre',
    address: 'A-791, Bandra Reclamation, Bandra West, Mumbai 400050',
    lat: 19.0522,
    lng: 72.8295,
    phone: '+91 22 2675 1000',
    emergencyContact: '+91 22 2656 8000',
    traumaLevel: 'Level 1 Trauma Center',
    icuBedsAvailable: 14,
    totalBeds: 323,
    rating: 4.9,
    specialities: ['Cardiology', 'Neurology', 'Trauma & Emergency', 'General Medicine'],
    ambulanceServiceAvailable: true,
  },
];

/**
 * GET /api/hospitals/nearby
 * Accepts lat, lng, and optional radiusKm.
 * Returns sorted list of nearby hospitals with computed distance and live emergency contacts.
 */
export const getNearbyHospitals = async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat) || 19.0760;
    const lng = Number(req.query.lng) || 72.8777;
    const radiusKm = Number(req.query.radiusKm) || 30;

    const nearbyHospitals = HOSPITALS_DATABASE.map((hosp) => {
      const distance = calculateDistance(lat, lng, hosp.lat, hosp.lng);
      return {
        ...hosp,
        distanceKm: distance,
        estimatedDriveMinutes: Math.max(3, Math.round(distance * 2.2)),
      };
    })
      .filter((hosp) => hosp.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({
      success: true,
      userLocation: { lat, lng },
      radiusKm,
      totalFound: nearbyHospitals.length,
      hospitals: nearbyHospitals,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
