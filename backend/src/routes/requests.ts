import { Router } from 'express';
import { RequestStatus } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../db';
import {
  broadcastToDriver,
  broadcastToHospital,
  broadcastToSuperAdmin,
  stopRouteSimulation,
} from '../socket';

const router = Router();

function isValidCoordinate(lat: any, lng: any): boolean {
  const nLat = parseFloat(lat);
  const nLng = parseFloat(lng);
  return (
    !isNaN(nLat) &&
    !isNaN(nLng) &&
    isFinite(nLat) &&
    isFinite(nLng) &&
    nLat >= -90 &&
    nLat <= 90 &&
    nLng >= -180 &&
    nLng <= 180
  );
}

// Get active request for patient, driver, or hospital
router.get('/active', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const userId = req.user.id;
  const role = req.user.role;

  try {
    let activeRequest = null;

    if (role === 'PATIENT') {
      activeRequest = await prisma.emergencyRequest.findFirst({
        where: {
          patientId: userId,
          status: {
            notIn: [RequestStatus.COMPLETED, RequestStatus.REJECTED],
          },
        },
        include: {
          driver: {
            include: {
              ambulance: true,
            },
          },
          hospital: true,
        },
      });
    } else if (role === 'DRIVER') {
      activeRequest = await prisma.emergencyRequest.findFirst({
        where: {
          driverId: userId,
          status: {
            notIn: [RequestStatus.COMPLETED, RequestStatus.REJECTED],
          },
        },
        include: {
          patient: {
            include: {
              patientProfile: true,
            },
          },
          hospital: true,
        },
      });
    } else if (role === 'ADMIN_HOSPITAL') {
      // Find the hospital managed by this admin
      const hospital = await prisma.hospital.findUnique({
        where: { adminUserId: userId },
      });

      if (hospital) {
        activeRequest = await prisma.emergencyRequest.findFirst({
          where: {
            hospitalId: hospital.id,
            status: {
              notIn: [RequestStatus.COMPLETED, RequestStatus.REJECTED],
            },
          },
          include: {
            patient: {
              include: {
                patientProfile: true,
              },
            },
            driver: {
              include: {
                ambulance: true,
              },
            },
            hospital: true,
          },
        });
      }
    }

    return res.json(activeRequest);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Cancel active emergency request by patient
router.post('/cancel', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const userId = req.user.id;

  try {
    const activeRequest = await prisma.emergencyRequest.findFirst({
      where: {
        patientId: userId,
        status: {
          notIn: [RequestStatus.COMPLETED, RequestStatus.REJECTED],
        },
      },
      include: { hospital: true },
    });

    if (!activeRequest) {
      return res.status(400).json({ message: 'No active request found to cancel' });
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const req = await tx.emergencyRequest.update({
        where: { id: activeRequest.id },
        data: {
          status: RequestStatus.REJECTED,
        },
        include: { hospital: true, patient: true },
      });

      if (activeRequest.driverId) {
        await tx.ambulance.update({
          where: { driverId: activeRequest.driverId },
          data: { isAvailable: true },
        });
      }

      return req;
    });

    // Real-Time Synchronized Broadcasts
    stopRouteSimulation(activeRequest.id);

    if (activeRequest.driverId) {
      broadcastToDriver(activeRequest.driverId, 'request:cancelled', { requestId: activeRequest.id });
    }

    broadcastToHospital(activeRequest.hospitalId, 'hospital:emergency_status_changed', {
      request: updatedRequest,
      status: RequestStatus.REJECTED,
    });
    broadcastToSuperAdmin('telemetry:update', {});

    res.json({ message: 'Emergency request cancelled successfully', request: updatedRequest });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to cancel request' });
  }
});

// Get user history (completed requests)
router.get('/history', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const userId = req.user.id;
  const role = req.user.role;

  try {
    let requests: any[] = [];

    if (role === 'PATIENT') {
      requests = await prisma.emergencyRequest.findMany({
        where: {
          patientId: userId,
          status: RequestStatus.COMPLETED,
        },
        include: {
          driver: true,
          hospital: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'DRIVER') {
      requests = await prisma.emergencyRequest.findMany({
        where: {
          driverId: userId,
          status: RequestStatus.COMPLETED,
        },
        include: {
          patient: true,
          hospital: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'ADMIN_HOSPITAL') {
      const hospital = await prisma.hospital.findUnique({
        where: { adminUserId: userId },
      });
      if (hospital) {
        requests = await prisma.emergencyRequest.findMany({
          where: {
            hospitalId: hospital.id,
            status: RequestStatus.COMPLETED,
          },
          include: {
            patient: true,
            driver: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    return res.json(requests);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// POST: Analyze symptoms and recommend specialist + hospital + ambulance tier (Health-Q style)
router.post('/symptom-triage', authenticate, async (req: AuthRequest, res) => {
  const { symptoms, lat, lng } = req.body;

  if (!symptoms || lat === undefined || lng === undefined) {
    return res.status(400).json({ message: 'Symptoms, lat, and lng are required parameters.' });
  }

  if (!isValidCoordinate(lat, lng)) {
    return res.status(400).json({ message: 'Invalid latitude or longitude coordinates provided.' });
  }

  const pLat = parseFloat(lat);
  const pLng = parseFloat(lng);

  try {
    const text = String(symptoms).toLowerCase();
    let specialty = 'General Medicine';
    let recommendedTier = 'BASIC_LIFE_SUPPORT';
    let analysis = 'Symptoms suggest general illness. BASIC LIFE SUPPORT vehicle is sufficient.';

    // Rule-based symptom analyzer (Health-Q matching logic)
    if (
      text.includes('chest') ||
      text.includes('heart') ||
      text.includes('cardiac') ||
      text.includes('radiat') ||
      text.includes('palpitation') ||
      text.includes('breath')
    ) {
      specialty = 'Cardiology';
      recommendedTier = 'ADVANCED_LIFE_SUPPORT';
      analysis = 'Symptoms match acute cardiovascular patterns. ADVANCED LIFE SUPPORT vehicle is strongly recommended.';
    } else if (
      text.includes('stroke') ||
      text.includes('seizure') ||
      text.includes('headache') ||
      text.includes('numb') ||
      text.includes('vision') ||
      text.includes('speech') ||
      text.includes('paraly')
    ) {
      specialty = 'Neurology';
      recommendedTier = 'ADVANCED_LIFE_SUPPORT';
      analysis = 'Symptoms correlate with neurological events. ADVANCED LIFE SUPPORT vehicle is recommended.';
    } else if (
      text.includes('fracture') ||
      text.includes('bone') ||
      text.includes('fall') ||
      text.includes('sprain') ||
      text.includes('joint') ||
      text.includes('broken') ||
      text.includes('dislocat')
    ) {
      specialty = 'Orthopedics';
      recommendedTier = 'BASIC_LIFE_SUPPORT';
      analysis = 'Symptoms indicate musculoskeletal trauma. BASIC LIFE SUPPORT vehicle with splints is recommended.';
    }

    // Retrieve hospitals from DB
    const allHospitals = await prisma.hospital.findMany();

    // Map each hospital to include distance & specialties list
    const scoredHospitals = allHospitals
      .map((h) => {
        // Haversine distance calculator
        const R = 6371; // Earth radius in km
        const dLat = ((h.lat - pLat) * Math.PI) / 180;
        const dLon = ((h.lng - pLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((pLat * Math.PI) / 180) * Math.cos((h.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;

        // Specialties mapping based on hospital profile/name
        let specialties = ['General Medicine'];
        if (h.name.includes('General')) {
          specialties = ['Cardiology', 'Neurology', 'Trauma', 'General Medicine'];
        } else if (h.name.includes('UCSF')) {
          specialties = ['Orthopedics', 'Pediatrics', 'Neurology', 'General Medicine'];
        } else if (h.name.includes('CPMC') || h.name.includes('Francis')) {
          specialties = ['Cardiology', 'Geriatrics', 'General Medicine'];
        }

        const supportsSpecialty = specialties.includes(specialty);

        return {
          id: h.id,
          name: h.name,
          lat: h.lat,
          lng: h.lng,
          availableBeds: h.availableBeds,
          address: h.address,
          distanceKm: parseFloat(distanceKm.toFixed(2)),
          specialties,
          supportsSpecialty,
        };
      })
      // Filter only hospitals with available beds
      .filter((h) => h.availableBeds > 0)
      // Sort: prioritize those supporting the specialty, then sort by distance
      .sort((a, b) => {
        if (a.supportsSpecialty && !b.supportsSpecialty) return -1;
        if (!a.supportsSpecialty && b.supportsSpecialty) return 1;
        return a.distanceKm - b.distanceKm;
      });

    return res.json({
      specialty,
      recommendedTier,
      analysis,
      hospitals: scoredHospitals,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

export default router;
