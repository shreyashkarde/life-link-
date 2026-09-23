import { Request, Response } from 'express';
import { Ambulance } from '../models/Ambulance';
import { prescriptoStore } from '../config/prescriptoStore';
import { isMongoConnected } from '../config/db';
import { AuthRequest } from '../middleware/auth';

// Haversine distance in kilometers
const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

// GET /api/ambulance/all
export const getAllAmbulances = async (_req: Request, res: Response) => {
  try {
    if (isMongoConnected()) {
      const ambulances = await Ambulance.find({});
      if (ambulances.length > 0) {
        return res.json({ success: true, ambulances });
      }
    }
    return res.json({ success: true, ambulances: prescriptoStore.ambulances || [] });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/ambulance/nearby?lat=19.0760&lng=72.8777&radius=15
export const getNearbyAmbulances = async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string) || 19.0760;
    const lng = parseFloat(req.query.lng as string) || 72.8777;
    const maxRadiusKm = parseFloat(req.query.radius as string) || 25;

    let fleet: any[] = [];
    if (isMongoConnected()) {
      fleet = await Ambulance.find({ isAvailable: true });
    }
    if (!fleet || fleet.length === 0) {
      fleet = (prescriptoStore.ambulances || []).filter((a) => a.isAvailable !== false);
    }

    const calculated = fleet.map((amb) => {
      const ambLat = amb.currentLocation?.lat || 19.0760;
      const ambLng = amb.currentLocation?.lng || 72.8777;
      const distance = calculateDistanceKm(lat, lng, ambLat, ambLng);
      // Rough ETA estimate: 2.5 mins per km in metropolitan conditions + 2 mins prep
      const etaMinutes = Math.max(3, Math.round(distance * 2.5 + 2));

      return {
        ...amb,
        distanceKm: distance,
        etaMinutes,
      };
    });

    // Filter by max radius & sort by closest
    const nearby = calculated
      .filter((a) => a.distanceKm <= maxRadiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({
      success: true,
      userLocation: { lat, lng },
      count: nearby.length,
      ambulances: nearby,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/ambulance/duty-toggle
export const toggleDriverDuty = async (req: AuthRequest, res: Response) => {
  try {
    const { ambulanceId, isAvailable } = req.body;
    const targetId = ambulanceId || req.user?.id;

    if (isMongoConnected()) {
      const amb = await Ambulance.findById(targetId);
      if (amb) {
        amb.isAvailable = typeof isAvailable === 'boolean' ? isAvailable : !amb.isAvailable;
        await amb.save();
        return res.json({ success: true, message: 'Driver duty status updated', isAvailable: amb.isAvailable });
      }
    }

    // In-memory fallback
    const amb = prescriptoStore.ambulances?.find((a) => a._id === targetId || a.driverId === targetId || a._id === 'amb_108');
    if (amb) {
      amb.isAvailable = typeof isAvailable === 'boolean' ? isAvailable : !amb.isAvailable;
      return res.json({ success: true, message: 'Driver duty status updated', isAvailable: amb.isAvailable });
    }

    return res.status(404).json({ success: false, message: 'Ambulance record not found' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/ambulance/location
export const updateAmbulanceLocation = async (req: AuthRequest, res: Response) => {
  try {
    const { ambulanceId, lat, lng, address, heading } = req.body;
    const targetId = ambulanceId || req.user?.id;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Valid lat & lng coordinates required' });
    }

    if (isMongoConnected()) {
      const amb = await Ambulance.findById(targetId);
      if (amb) {
        amb.currentLocation = {
          lat,
          lng,
          address: address || amb.currentLocation?.address,
          heading: heading || 0,
          lastUpdated: new Date(),
        };
        await amb.save();
        return res.json({ success: true, message: 'Location updated', currentLocation: amb.currentLocation });
      }
    }

    const amb = prescriptoStore.ambulances?.find((a) => a._id === targetId || a._id === 'amb_108');
    if (amb) {
      amb.currentLocation = {
        lat,
        lng,
        address: address || amb.currentLocation?.address,
        heading: heading || 0,
        lastUpdated: new Date(),
      };
      return res.json({ success: true, message: 'Location updated', currentLocation: amb.currentLocation });
    }

    return res.status(404).json({ success: false, message: 'Ambulance record not found' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
