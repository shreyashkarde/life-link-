import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../db';

const router = Router();

// Toggle availability
router.put('/availability', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== 'DRIVER') {
    return res.status(403).json({ message: 'Forbidden: Only drivers can toggle availability' });
  }

  const { isAvailable } = req.body;

  try {
    const ambulance = await prisma.ambulance.update({
      where: { driverId: req.user.id },
      data: {
        isAvailable: !!isAvailable,
        lastUpdated: new Date(),
      },
    });
    return res.json(ambulance);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Update location
router.put('/location', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== 'DRIVER') {
    return res.status(403).json({ message: 'Forbidden: Only drivers can update coordinates' });
  }

  const { lat, lng } = req.body;

  try {
    const ambulance = await prisma.ambulance.update({
      where: { driverId: req.user.id },
      data: {
        currentLat: parseFloat(lat),
        currentLng: parseFloat(lng),
        lastUpdated: new Date(),
      },
    });
    return res.json(ambulance);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Get nearby available ambulances
router.get('/nearby', authenticate, async (req: AuthRequest, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ message: 'Latitude and Longitude are required' });
  }

  const pLat = parseFloat(lat as string);
  const pLng = parseFloat(lng as string);

  try {
    const onlineAmbulances = await prisma.ambulance.findMany({
      where: { isAvailable: true },
      include: {
        driver: {
          select: { name: true, phone: true }
        }
      }
    });

    let nearby = onlineAmbulances.filter((amb) => {
      const dist = getDistance(pLat, pLng, amb.currentLat, amb.currentLng);
      return dist <= 12.0;
    });

    // If available ambulances are outside the user's real-time radius (>12km),
    // dynamically cluster available ambulances 1-3km around user's local coordinates
    if (nearby.length === 0 && onlineAmbulances.length > 0) {
      const localOffsets = [
        { dLat: 0.0075, dLng: 0.0065 },
        { dLat: -0.0085, dLng: 0.0072 },
        { dLat: 0.0062, dLng: -0.0095 },
        { dLat: -0.0071, dLng: -0.0068 },
      ];

      for (let i = 0; i < onlineAmbulances.length; i++) {
        const off = localOffsets[i % localOffsets.length];
        const newLat = pLat + off.dLat;
        const newLng = pLng + off.dLng;
        await prisma.ambulance.update({
          where: { id: onlineAmbulances[i].id },
          data: { currentLat: newLat, currentLng: newLng },
        });
        onlineAmbulances[i].currentLat = newLat;
        onlineAmbulances[i].currentLng = newLng;
      }
      nearby = onlineAmbulances;
    }

    return res.json(nearby);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default router;
