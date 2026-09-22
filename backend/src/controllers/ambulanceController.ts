import { Request, Response } from 'express';
import { Ambulance } from '../models/Ambulance';
import { AuthRequest } from '../middleware/auth';
import { isMongoConnected } from '../config/db';
import { memoryStore } from '../config/mockStore';

// Helper to calculate approximate distance in KM using Haversine formula
export const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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
  return Math.round(R * c * 10) / 10;
};

// Get available nearby ambulances
export const getNearbyAmbulances = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng, type } = req.query;
    const userLat = lat ? parseFloat(lat as string) : 19.076;
    const userLng = lng ? parseFloat(lng as string) : 72.8777;

    if (!isMongoConnected()) {
      let list = memoryStore.ambulances.filter((a) => a.isOnline);
      if (type && type !== 'ALL') {
        list = list.filter((a) => a.ambulanceType === type);
      }

      const results = list.map((amb) => {
        const distance = calculateDistanceKm(userLat, userLng, amb.currentLocation.lat, amb.currentLocation.lng);
        return {
          ...amb,
          distanceKm: distance,
          etaMinutes: Math.max(3, Math.round(distance * 3)),
          estimatedFare: Math.round(amb.baseFare + distance * amb.perKmRate),
        };
      });

      res.json({ success: true, count: results.length, ambulances: results });
      return;
    }

    const filter: any = { isOnline: true, status: 'AVAILABLE' };
    if (type && type !== 'ALL') {
      filter.ambulanceType = type;
    }

    const ambulances = await Ambulance.find(filter)
      .populate('driverId', 'name email phone avatar')
      .populate('hospitalId', 'name address contactNumber');

    const results = ambulances.map((amb: any) => {
      const distance = calculateDistanceKm(
        userLat,
        userLng,
        amb.currentLocation.lat,
        amb.currentLocation.lng
      );
      const etaMinutes = Math.max(3, Math.round(distance * 3));
      const estimatedFare = Math.round(amb.baseFare + distance * amb.perKmRate);

      return {
        ...amb.toObject(),
        distanceKm: distance,
        etaMinutes,
        estimatedFare,
      };
    });

    results.sort((a, b) => a.distanceKm - b.distanceKm);
    res.json({ success: true, count: results.length, ambulances: results });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch ambulances' });
  }
};

// Driver: Get current driver ambulance profile & status
export const getDriverProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const uId = req.user?._id || req.user?.id;

    if (!isMongoConnected()) {
      const amb = memoryStore.ambulances.find((a) => a.driverId?._id === uId || a.driverId?.id === uId) || memoryStore.ambulances[0];
      res.json({ success: true, ambulance: amb });
      return;
    }

    const ambulance = await Ambulance.findOne({ driverId: req.user._id })
      .populate('driverId', 'name email phone avatar')
      .populate('hospitalId', 'name address emergencyNumber');

    if (!ambulance) {
      res.status(404).json({ success: false, message: 'No registered vehicle for this driver' });
      return;
    }

    res.json({ success: true, ambulance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch driver profile' });
  }
};

// Driver: Toggle Online / Offline Status
export const toggleDriverStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isOnline, status } = req.body;
    const uId = req.user?._id || req.user?.id;

    if (!isMongoConnected()) {
      const amb = memoryStore.ambulances.find((a) => a.driverId?._id === uId || a.driverId?.id === uId) || memoryStore.ambulances[0];
      if (amb) {
        if (isOnline !== undefined) amb.isOnline = isOnline;
        if (status) amb.status = status;
      }
      res.json({ success: true, message: 'Driver status updated', ambulance: amb });
      return;
    }

    const ambulance = await Ambulance.findOne({ driverId: req.user._id });
    if (!ambulance) {
      res.status(404).json({ success: false, message: 'Ambulance profile not found' });
      return;
    }

    if (isOnline !== undefined) {
      ambulance.isOnline = isOnline;
      ambulance.status = isOnline ? (status || 'AVAILABLE') : 'OFFLINE';
    } else if (status) {
      ambulance.status = status;
    }

    await ambulance.save();
    res.json({ success: true, message: 'Driver status updated', ambulance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to toggle status' });
  }
};

// Driver: Update Live Location coordinates
export const updateLiveLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { lat, lng, address, heading, speed } = req.body;
    const uId = req.user?._id || req.user?.id;

    if (!isMongoConnected()) {
      const amb = memoryStore.ambulances.find((a) => a.driverId?._id === uId || a.driverId?.id === uId) || memoryStore.ambulances[0];
      if (amb) {
        amb.currentLocation = {
          lat,
          lng,
          address: address || amb.currentLocation.address,
          heading: heading || 0,
          speed: speed || 0,
          lastUpdated: new Date().toISOString(),
        };
      }
      res.json({ success: true, currentLocation: amb?.currentLocation });
      return;
    }

    const ambulance = await Ambulance.findOneAndUpdate(
      { driverId: req.user._id },
      {
        'currentLocation.lat': lat,
        'currentLocation.lng': lng,
        ...(address && { 'currentLocation.address': address }),
        ...(heading !== undefined && { 'currentLocation.heading': heading }),
        ...(speed !== undefined && { 'currentLocation.speed': speed }),
        'currentLocation.lastUpdated': new Date(),
      },
      { new: true }
    );

    res.json({ success: true, currentLocation: ambulance?.currentLocation });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update location' });
  }
};
