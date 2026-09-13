import { Router } from 'express';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import prisma from '../db';

const router = Router();

// Only SUPER_ADMIN allowed
router.use(authenticate, authorize([Role.SUPER_ADMIN]));

// Telemetry endpoint
router.get('/telemetry', async (req: AuthRequest, res) => {
  try {
    const totalTrips = await prisma.emergencyRequest.count();
    const activeCount = await prisma.emergencyRequest.count({
      where: {
        status: {
          notIn: ['COMPLETED', 'REJECTED'],
        },
      },
    });

    const onlineDriversCount = await prisma.ambulance.count({
      where: { isAvailable: true },
    });

    const hospitals = await prisma.hospital.findMany({
      include: {
        adminUser: {
          select: { name: true, email: true, phone: true },
        },
      },
    });

    const totalBeds = hospitals.reduce((sum, h) => sum + h.availableBeds, 0);

    const completedTrips = await prisma.emergencyRequest.count({
      where: { status: 'COMPLETED' },
    });
    const successRate = totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 100;

    const requests = await prisma.emergencyRequest.findMany({
      include: {
        patient: { select: { name: true, email: true } },
        driver: { select: { name: true } },
        hospital: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const drivers = await prisma.ambulance.findMany({
      include: {
        driver: {
          select: { name: true, email: true, phone: true },
        },
      },
    });

    return res.json({
      telemetry: {
        totalTrips,
        activeCount,
        onlineDriversCount,
        totalBeds,
        successRate,
      },
      requests,
      drivers,
      hospitals,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Create Hospital Admin + Hospital
router.post('/hospitals', async (req: AuthRequest, res) => {
  const {
    name,
    address,
    contactNumber,
    lat,
    lng,
    availableBeds,
    adminName,
    adminEmail,
    adminPassword,
  } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this admin email' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(adminPassword || 'password123', salt);

    const result = await prisma.$transaction(async (tx) => {
      const adminUser = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          passwordHash,
          role: Role.ADMIN_HOSPITAL,
          phone: contactNumber,
        },
      });

      const hospital = await tx.hospital.create({
        data: {
          name,
          address,
          contactNumber,
          lat: parseFloat(lat) || 37.7749,
          lng: parseFloat(lng) || -122.4194,
          availableBeds: parseInt(availableBeds) || 0,
          adminUserId: adminUser.id,
        },
      });

      return { adminUser, hospital };
    });

    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Edit hospital
router.put('/hospitals/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, address, contactNumber, lat, lng, availableBeds } = req.body;

  try {
    const hospital = await prisma.hospital.update({
      where: { id },
      data: {
        name,
        address,
        contactNumber,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        availableBeds: parseInt(availableBeds) || 0,
      },
    });
    return res.json(hospital);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Delete hospital
router.delete('/hospitals/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const hospital = await prisma.hospital.findUnique({ where: { id } });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    await prisma.$transaction([
      prisma.hospital.delete({ where: { id } }),
      prisma.user.delete({ where: { id: hospital.adminUserId } }),
    ]);

    return res.json({ message: 'Hospital and admin user deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Seed editor to edit details (for quick local modifications)
router.put('/seed-data', async (req: AuthRequest, res) => {
  const { type, id, ...data } = req.body;

  try {
    if (type === 'driver') {
      const updated = await prisma.ambulance.update({
        where: { id },
        data: {
          vehicleNumber: data.vehicleNumber,
          currentLat: parseFloat(data.currentLat),
          currentLng: parseFloat(data.currentLng),
          isAvailable: data.isAvailable,
        },
      });
      return res.json(updated);
    } else if (type === 'hospital') {
      const updated = await prisma.hospital.update({
        where: { id },
        data: {
          name: data.name,
          availableBeds: parseInt(data.availableBeds) || 0,
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lng),
        },
      });
      return res.json(updated);
    }
    return res.status(400).json({ message: 'Invalid edit type' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// GET all users (Patients, Drivers, Admins, Super Admin)
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        patientProfile: true,
        ambulance: true,
        hospital: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Hide password hashes
    const safeUsers = users.map((u) => {
      const { passwordHash, ...safe } = u;
      return safe;
    });

    return res.json(safeUsers);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// PUT update user (Super Admin modify user data)
router.put('/users/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    phone,
    role,
    // Patient specific
    bloodGroup,
    allergies,
    emergencyContactName,
    emergencyContactPhone,
    medicalNotes,
    // Driver specific
    vehicleNumber,
    ambulanceType,
    isAvailable,
  } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          role,
        },
      });

      if (role === 'PATIENT') {
        await tx.patientProfile.upsert({
          where: { userId: id },
          update: {
            bloodGroup,
            allergies,
            emergencyContactName,
            emergencyContactPhone,
            medicalNotes,
          },
          create: {
            userId: id,
            bloodGroup: bloodGroup || 'O+',
            allergies: allergies || '',
            emergencyContactName: emergencyContactName || 'Emergency Services',
            emergencyContactPhone: emergencyContactPhone || '',
            medicalNotes: medicalNotes || '',
          },
        });
      } else if (role === 'DRIVER') {
        await tx.ambulance.upsert({
          where: { driverId: id },
          update: {
            vehicleNumber,
            ambulanceType,
            isAvailable: !!isAvailable,
          },
          create: {
            driverId: id,
            vehicleNumber: vehicleNumber || 'AMB-NEW',
            ambulanceType: ambulanceType || 'BASIC_LIFE_SUPPORT',
            isAvailable: !!isAvailable,
            currentLat: 37.7749,
            currentLng: -122.4194,
          },
        });
      }

      return u;
    });

    return res.json(updatedUser);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// DELETE delete user (Super Admin remove account)
router.delete('/users/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // We delete the user. Prisma schemas cascade deletes PatientProfile, Ambulance, and Hospital because of cascade configuration!
    await prisma.user.delete({ where: { id } });
    return res.json({ message: 'User account and profile deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

export default router;
