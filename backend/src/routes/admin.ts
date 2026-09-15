import { Router } from 'express';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import prisma from '../db';
import { logAdminActivity } from '../utils/activityLogger';

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

// =========================================================================
// HOSPITAL ADMIN MANAGEMENT (Feature 3)
// =========================================================================

// List all Hospital Admins
router.get('/hospital-admins', async (req: AuthRequest, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN_HOSPITAL },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            address: true,
            contactNumber: true,
            availableBeds: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const safeAdmins = admins.map(({ passwordHash, ...safe }) => safe);
    return res.json(safeAdmins);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Soft delete / Reactivate hospital admin
router.patch('/hospital-admins/:id/toggle-status', async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { hospital: true },
    });

    if (!user || user.role !== Role.ADMIN_HOSPITAL) {
      return res.status(404).json({ message: 'Hospital admin account not found' });
    }

    const newStatus = !user.isActive;
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: newStatus },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        hospital: true,
      },
    });

    // Record activity log
    await logAdminActivity(
      req.user!.id,
      newStatus ? 'HOSPITAL_ADMIN_REACTIVATED' : 'HOSPITAL_ADMIN_DEACTIVATED',
      {
        targetAdminId: id,
        adminEmail: user.email,
        hospitalName: user.hospital?.name || 'Unassigned',
        newStatus: newStatus ? 'ACTIVE' : 'DEACTIVATED',
      }
    );

    return res.json({
      message: `Hospital admin account ${newStatus ? 'reactivated' : 'deactivated'} successfully`,
      admin: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Update hospital admin details
router.put('/hospital-admins/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, email, phone, hospitalName, address, contactNumber, availableBeds } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { hospital: true },
    });

    if (!user || user.role !== Role.ADMIN_HOSPITAL) {
      return res.status(404).json({ message: 'Hospital admin account not found' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: {
          name: name || user.name,
          email: email || user.email,
          phone: phone !== undefined ? phone : user.phone,
        },
      });

      let h = null;
      if (user.hospital) {
        h = await tx.hospital.update({
          where: { id: user.hospital.id },
          data: {
            name: hospitalName || user.hospital.name,
            address: address || user.hospital.address,
            contactNumber: contactNumber || user.hospital.contactNumber,
            availableBeds: availableBeds !== undefined ? parseInt(availableBeds) : user.hospital.availableBeds,
          },
        });
      }

      return { user: u, hospital: h };
    });

    await logAdminActivity(req.user!.id, 'HOSPITAL_ADMIN_UPDATED', {
      targetAdminId: id,
      adminEmail: updated.user.email,
      hospitalName: updated.hospital?.name,
    });

    const { passwordHash: _, ...safeUser } = updated.user;
    return res.json({ user: safeUser, hospital: updated.hospital });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// =========================================================================
// HOSPITAL REGISTRATION APPROVAL WORKFLOW (Feature 4)
// =========================================================================

// List pending or all hospital registrations
router.get('/hospital-registrations', async (req: AuthRequest, res) => {
  const status = req.query.status as string;

  try {
    const where: any = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    const registrations = await prisma.hospitalRegistration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.json(registrations);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Approve hospital registration
router.post('/hospital-registrations/:id/approve', async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const reg = await prisma.hospitalRegistration.findUnique({ where: { id } });
    if (!reg) {
      return res.status(404).json({ message: 'Hospital registration not found' });
    }

    if (reg.status !== 'PENDING') {
      return res.status(400).json({ message: `Registration has already been ${reg.status.toLowerCase()}` });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: reg.email } });
    if (existingUser) {
      return res.status(400).json({ message: 'A user account with this email address already exists' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create real User record with role ADMIN_HOSPITAL using submitted pre-hashed password
      const adminUser = await tx.user.create({
        data: {
          name: `${reg.hospitalName} Administrator`,
          email: reg.email,
          passwordHash: reg.passwordHash,
          role: Role.ADMIN_HOSPITAL,
          phone: reg.contactNumber,
          isActive: true,
        },
      });

      // 2. Create Hospital record linked to this admin
      const hospital = await tx.hospital.create({
        data: {
          name: reg.hospitalName,
          address: reg.address || 'Standard Medical Facility',
          contactNumber: reg.contactNumber,
          lat: 37.7749 + (Math.random() - 0.5) * 0.05,
          lng: -122.4194 + (Math.random() - 0.5) * 0.05,
          availableBeds: 12,
          adminUserId: adminUser.id,
        },
      });

      // 3. Mark registration as APPROVED
      const updatedReg = await tx.hospitalRegistration.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedBy: req.user!.id,
        },
      });

      return { adminUser, hospital, registration: updatedReg };
    });

    // Broadcast activity log to Super Admin room
    await logAdminActivity(req.user!.id, 'HOSPITAL_REGISTRATION_APPROVED', {
      registrationId: id,
      hospitalName: reg.hospitalName,
      adminEmail: reg.email,
      adminId: result.adminUser.id,
    });

    const { passwordHash: _, ...safeUser } = result.adminUser;
    return res.json({
      message: `Hospital "${reg.hospitalName}" approved successfully! Hospital admin account created.`,
      user: safeUser,
      hospital: result.hospital,
    });
  } catch (error: any) {
    console.error('Approval error:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Reject hospital registration
router.post('/hospital-registrations/:id/reject', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const reg = await prisma.hospitalRegistration.findUnique({ where: { id } });
    if (!reg) {
      return res.status(404).json({ message: 'Hospital registration not found' });
    }

    if (reg.status !== 'PENDING') {
      return res.status(400).json({ message: `Registration has already been ${reg.status.toLowerCase()}` });
    }

    const updatedReg = await prisma.hospitalRegistration.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || 'Application did not meet criteria',
        reviewedAt: new Date(),
        reviewedBy: req.user!.id,
      },
    });

    await logAdminActivity(req.user!.id, 'HOSPITAL_REGISTRATION_REJECTED', {
      registrationId: id,
      hospitalName: reg.hospitalName,
      adminEmail: reg.email,
      reason: reason || 'Application did not meet criteria',
    });

    return res.json({
      message: `Hospital registration for "${reg.hospitalName}" marked as REJECTED.`,
      registration: updatedReg,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// =========================================================================
// REAL-TIME ACTIVITY LOGS (Feature 3)
// =========================================================================

router.get('/activity-logs', async (req: AuthRequest, res) => {
  const adminId = req.query.adminId as string;
  const limit = parseInt(req.query.limit as string) || 60;

  try {
    const where: any = {};
    if (adminId) {
      where.adminId = adminId;
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            hospital: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return res.json(logs);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

export default router;
