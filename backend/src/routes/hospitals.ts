import { Router } from 'express';
import { Role, BedStatus, WardType, BookingType, BookingStatus, TriageLevel } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../db';
import { broadcastToHospital, broadcastToDriver, broadcastToPatient, getIO } from '../socket';
import { logAdminActivity } from '../utils/activityLogger';

const router = Router();

// Helper: Get hospital managed by logged-in admin or user
async function getAdminHospital(userId: string, role?: Role) {
  if (role === Role.ADMIN_HOSPITAL) {
    return prisma.hospital.findUnique({
      where: { adminUserId: userId },
    });
  }
  // For SUPER_ADMIN fallback, get first hospital or check if adminUserId matches
  const direct = await prisma.hospital.findUnique({
    where: { adminUserId: userId },
  });
  if (direct) return direct;
  return prisma.hospital.findFirst();
}

// Helper: Seed realistic default bed layout if hospital has no beds
async function ensureHospitalBeds(hospitalId: string) {
  const count = await prisma.hospitalBed.count({ where: { hospitalId } });
  if (count > 0) return;

  const defaultBeds = [
    // 4 ICU Beds
    { bedNumber: 'ICU-01', ward: WardType.ICU, status: BedStatus.OCCUPIED, patientName: 'Michael Vance', assignedDoctor: 'Dr. Robert Chen', notes: 'Severe respiratory distress, connected to mechanical ventilator', admittedAt: new Date(Date.now() - 4 * 3600 * 1000) },
    { bedNumber: 'ICU-02', ward: WardType.ICU, status: BedStatus.AVAILABLE, notes: 'Telemetry & invasive hemodynamic monitoring ready' },
    { bedNumber: 'ICU-03', ward: WardType.ICU, status: BedStatus.AVAILABLE, notes: 'Equipped with Hamilton-C3 transport ventilator' },
    { bedNumber: 'ICU-04', ward: WardType.ICU, status: BedStatus.CLEANING, cleaningPriority: 'TERMINAL_DISINFECTION', cleanedBy: 'Sanitation Team Alpha', notes: 'Under ultraviolet terminal disinfection' },

    // 4 Emergency Trauma Resuscitation Bays
    { bedNumber: 'ER-01', ward: WardType.EMERGENCY_ER, status: BedStatus.OCCUPIED, patientName: 'Sophia Chen', assignedDoctor: 'Dr. Sarah Connor', notes: 'STEMI cardiac protocol initiated, Cath lab prepped', admittedAt: new Date(Date.now() - 45 * 60 * 1000) },
    { bedNumber: 'ER-02', ward: WardType.TRAUMA, status: BedStatus.AVAILABLE, notes: 'Rapid infuser & ultrasound triage console on standby' },
    { bedNumber: 'ER-03', ward: WardType.EMERGENCY_ER, status: BedStatus.AVAILABLE, notes: 'General resuscitation bay' },
    { bedNumber: 'ER-04', ward: WardType.TRAUMA, status: BedStatus.RESERVED, notes: 'Reserved for incoming ambulance Medic-12' },

    // 8 General Ward Beds
    { bedNumber: 'GW-101', ward: WardType.GENERAL_WARD, status: BedStatus.OCCUPIED, patientName: 'James Wilson', assignedDoctor: 'Dr. Angela Martinez', notes: 'Post-laparoscopic recovery, vitals stable', admittedAt: new Date(Date.now() - 24 * 3600 * 1000) },
    { bedNumber: 'GW-102', ward: WardType.GENERAL_WARD, status: BedStatus.AVAILABLE, notes: 'Standard electric medical bed' },
    { bedNumber: 'GW-103', ward: WardType.GENERAL_WARD, status: BedStatus.AVAILABLE, notes: 'Low air loss mattress installed' },
    { bedNumber: 'GW-104', ward: WardType.GENERAL_WARD, status: BedStatus.CLEANING, cleaningPriority: 'ROUTINE', cleanedBy: 'Housekeeper Linda', notes: 'Bed stripped, sanitizing side rails and mattress' },
    { bedNumber: 'GW-105', ward: WardType.GENERAL_WARD, status: BedStatus.OCCUPIED, patientName: 'Margaret Thatcher', assignedDoctor: 'Dr. Angela Martinez', notes: 'Pneumonia IV antibiotic therapy Day 2', admittedAt: new Date(Date.now() - 48 * 3600 * 1000) },
    { bedNumber: 'GW-106', ward: WardType.GENERAL_WARD, status: BedStatus.AVAILABLE, notes: 'Standard general inpatient bed' },
    { bedNumber: 'GW-107', ward: WardType.GENERAL_WARD, status: BedStatus.AVAILABLE, notes: 'Cardiac telemetry step-down bed' },
    { bedNumber: 'GW-108', ward: WardType.GENERAL_WARD, status: BedStatus.MAINTENANCE, notes: 'Hydraulic elevation mechanism undergoing repair' },

    // 2 Pediatric Beds
    { bedNumber: 'PED-01', ward: WardType.PEDIATRIC, status: BedStatus.AVAILABLE, notes: 'Pediatric crib bed with safety barrier' },
    { bedNumber: 'PED-02', ward: WardType.PEDIATRIC, status: BedStatus.OCCUPIED, patientName: 'Liam Miller', assignedDoctor: 'Dr. Sarah Connor', notes: 'Acute viral dehydration, saline infusion active', admittedAt: new Date(Date.now() - 6 * 3600 * 1000) },

    // 2 Surgical Post-Op Beds
    { bedNumber: 'SURG-01', ward: WardType.SURGICAL, status: BedStatus.AVAILABLE, notes: 'Post-anesthesia recovery unit bed' },
    { bedNumber: 'SURG-02', ward: WardType.SURGICAL, status: BedStatus.OCCUPIED, patientName: 'Robert Johnson', assignedDoctor: 'Dr. Robert Chen', notes: 'Total hip arthroplasty post-op monitoring', admittedAt: new Date(Date.now() - 12 * 3600 * 1000) },
  ];

  await prisma.hospitalBed.createMany({
    data: defaultBeds.map((b) => ({ ...b, hospitalId })),
  });

  // Also seed a couple realistic bookings if empty
  const bookingCount = await prisma.hospitalBooking.count({ where: { hospitalId } });
  if (bookingCount === 0) {
    await prisma.hospitalBooking.createMany({
      data: [
        {
          hospitalId,
          patientName: 'Sophia Chen',
          patientPhone: '+15550199',
          bookingType: BookingType.EMERGENCY_ADMISSION,
          department: 'Emergency & Trauma ER',
          doctorName: 'Dr. Sarah Connor',
          status: BookingStatus.ADMITTED,
          triageLevel: TriageLevel.RED_CRITICAL,
          symptoms: 'Crushing chest pain radiating to left arm, acute STEMI',
          notes: 'Emergency ambulance inbound matched with bay ER-01',
        },
        {
          hospitalId,
          patientName: 'David Lee',
          patientPhone: '+15550288',
          bookingType: BookingType.OPD_CONSULTATION,
          department: 'Cardiology',
          doctorName: 'Dr. Robert Chen',
          status: BookingStatus.CONFIRMED,
          triageLevel: TriageLevel.YELLOW_URGENT,
          symptoms: 'Exertional dyspnea, palpitations, hypertension history',
          scheduledDate: new Date(Date.now() + 2 * 3600 * 1000),
          notes: 'Echo and ECG requested',
        },
        {
          hospitalId,
          patientName: 'Emma Watson',
          patientPhone: '+15550377',
          bookingType: BookingType.BED_RESERVATION,
          department: 'Orthopedics',
          doctorName: 'Dr. Angela Martinez',
          status: BookingStatus.PENDING,
          triageLevel: TriageLevel.GREEN_ROUTINE,
          symptoms: 'Elective knee arthroscopy scheduled',
          scheduledDate: new Date(Date.now() + 24 * 3600 * 1000),
          notes: 'Pre-op clearance completed',
        },
      ],
    });
  }

  // Synchronize availableBeds count on hospital
  const availCount = await prisma.hospitalBed.count({
    where: { hospitalId, status: BedStatus.AVAILABLE },
  });
  await prisma.hospital.update({
    where: { id: hospitalId },
    data: { availableBeds: availCount },
  });
}

// -------------------------------------------------------------
// Public & Patient Endpoints
// -------------------------------------------------------------

// Haversine distance formula (in km)
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  return R * c;
}

function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

// GET /api/hospitals/nearby?lat=&lng=&radius=&search=
router.get('/nearby', async (req, res) => {
  try {
    const latStr = req.query.lat as string | undefined;
    const lngStr = req.query.lng as string | undefined;
    const radiusStr = req.query.radius as string | undefined;
    const search = (req.query.search as string | undefined)?.trim().toLowerCase();

    const radius = radiusStr ? parseFloat(radiusStr) : 15; // default 15km
    const hasCoords = latStr && lngStr && !isNaN(parseFloat(latStr)) && !isNaN(parseFloat(lngStr));
    const userLat = hasCoords ? parseFloat(latStr!) : null;
    const userLng = hasCoords ? parseFloat(lngStr!) : null;

    let hospitals = await prisma.hospital.findMany({
      where: { NOT: { adminUser: { email: { endsWith: '@osm.lifelink.local' } } } },
      include: {
        doctors: {
          where: { isActive: true },
          select: { id: true, name: true, specialization: true, experienceYears: true, consultationFee: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (search) {
      hospitals = hospitals.filter(
        (h) =>
          h.name.toLowerCase().includes(search) ||
          h.address.toLowerCase().includes(search) ||
          h.doctors.some((d) => d.specialization.toLowerCase().includes(search) || d.name.toLowerCase().includes(search))
      );
    }

    if (userLat !== null && userLng !== null) {
      const hospitalsWithDistance = hospitals.map((h) => {
        const distanceKm = haversineDistanceKm(userLat, userLng, h.lat, h.lng);
        return {
          ...h,
          distanceKm: Math.round(distanceKm * 100) / 100,
          distanceLabel: formatDistance(distanceKm),
        };
      });

      // Filter within radius
      let filtered = hospitalsWithDistance.filter((h) => h.distanceKm <= radius);
      // Fallback: If no hospital is within radius (e.g. mock coordinates far away), return all sorted nearest-first
      if (filtered.length === 0) {
        filtered = hospitalsWithDistance;
      }
      filtered.sort((a, b) => a.distanceKm - b.distanceKm);

      return res.json({
        hasLocation: true,
        userLocation: { lat: userLat, lng: userLng },
        radiusKm: radius,
        count: filtered.length,
        hospitals: filtered,
      });
    }

    // Geolocation absent or denied fallback
    return res.json({
      hasLocation: false,
      count: hospitals.length,
      hospitals: hospitals.map((h) => ({
        ...h,
        distanceKm: null,
        distanceLabel: 'Distance unavailable',
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fetch nearby hospitals' });
  }
});

// GET /api/hospitals - list all hospitals
router.get('/', async (req, res) => {
  try {
    const search = (req.query.search as string | undefined)?.trim().toLowerCase();
    let hospitals = await prisma.hospital.findMany({
      include: {
        doctors: {
          where: { isActive: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (search) {
      hospitals = hospitals.filter(
        (h) =>
          h.name.toLowerCase().includes(search) ||
          h.address.toLowerCase().includes(search)
      );
    }

    return res.json(hospitals);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fetch hospitals' });
  }
});

// List all hospitals with detailed live bed capacities
router.get('/capacities', async (req, res) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      include: {
        beds: {
          select: { ward: true, status: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const enriched = hospitals.map((h) => {
      const totalBeds = h.beds.length;
      const availableBeds = h.beds.filter((b) => b.status === BedStatus.AVAILABLE).length;
      const occupiedBeds = h.beds.filter((b) => b.status === BedStatus.OCCUPIED).length;
      const cleaningBeds = h.beds.filter((b) => b.status === BedStatus.CLEANING).length;

      const icuAvailable = h.beds.filter((b) => b.ward === WardType.ICU && b.status === BedStatus.AVAILABLE).length;
      const icuTotal = h.beds.filter((b) => b.ward === WardType.ICU).length;

      const erAvailable = h.beds.filter(
        (b) => (b.ward === WardType.EMERGENCY_ER || b.ward === WardType.TRAUMA) && b.status === BedStatus.AVAILABLE
      ).length;
      const erTotal = h.beds.filter((b) => b.ward === WardType.EMERGENCY_ER || b.ward === WardType.TRAUMA).length;

      const generalAvailable = h.beds.filter((b) => b.ward === WardType.GENERAL_WARD && b.status === BedStatus.AVAILABLE).length;
      const generalTotal = h.beds.filter((b) => b.ward === WardType.GENERAL_WARD).length;

      return {
        id: h.id,
        name: h.name,
        address: h.address,
        contactNumber: h.contactNumber,
        lat: h.lat,
        lng: h.lng,
        totalBeds: totalBeds || h.availableBeds,
        availableBeds: availableBeds || h.availableBeds,
        occupiedBeds,
        cleaningBeds,
        wards: {
          icu: { available: icuAvailable, total: icuTotal },
          er: { available: erAvailable, total: erTotal },
          general: { available: generalAvailable, total: generalTotal },
        },
      };
    });

    return res.json(enriched);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fetch hospital capacities' });
  }
});

// Patient: Get my hospital admissions and bookings
router.get('/bookings/my', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const bookings = await prisma.hospitalBooking.findMany({
      where: {
        OR: [
          { patientId: req.user.id },
          ...(req.user.email ? [{ patient: { email: req.user.email } }] : []),
        ],
      },
      include: {
        hospital: { select: { name: true, address: true, contactNumber: true } },
        assignedBed: { select: { bedNumber: true, ward: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(bookings);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fetch patient bookings' });
  }
});

// -------------------------------------------------------------
// Hospital Operations & Bed Management Endpoints
// -------------------------------------------------------------

// List all beds of the logged-in admin's hospital
router.get('/beds', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || (req.user.role !== Role.ADMIN_HOSPITAL && req.user.role !== Role.SUPER_ADMIN)) {
    return res.status(403).json({ message: 'Forbidden: Only hospital administrators can access bed management' });
  }

  try {
    const hospital = await getAdminHospital(req.user.id, req.user.role);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found for this administrator' });
    }

    // Ensure realistic beds exist
    await ensureHospitalBeds(hospital.id);

    const beds = await prisma.hospitalBed.findMany({
      where: { hospitalId: hospital.id },
      orderBy: [{ ward: 'asc' }, { bedNumber: 'asc' }],
    });

    // Compute comprehensive statistics
    const stats = {
      total: beds.length,
      available: beds.filter((b) => b.status === BedStatus.AVAILABLE).length,
      occupied: beds.filter((b) => b.status === BedStatus.OCCUPIED).length,
      cleaning: beds.filter((b) => b.status === BedStatus.CLEANING).length,
      maintenance: beds.filter((b) => b.status === BedStatus.MAINTENANCE).length,
      reserved: beds.filter((b) => b.status === BedStatus.RESERVED).length,
      icuAvailable: beds.filter((b) => b.ward === WardType.ICU && b.status === BedStatus.AVAILABLE).length,
      erAvailable: beds.filter((b) => (b.ward === WardType.EMERGENCY_ER || b.ward === WardType.TRAUMA) && b.status === BedStatus.AVAILABLE).length,
    };

    return res.json({ beds, stats, hospital });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fetch hospital beds' });
  }
});

// Add new bed to hospital
router.post('/beds', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || (req.user.role !== Role.ADMIN_HOSPITAL && req.user.role !== Role.SUPER_ADMIN)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { bedNumber, ward, notes } = req.body;

  try {
    const hospital = await getAdminHospital(req.user.id, req.user.role);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const existing = await prisma.hospitalBed.findFirst({
      where: { hospitalId: hospital.id, bedNumber },
    });
    if (existing) {
      return res.status(400).json({ message: `Bed ${bedNumber} already exists in this hospital` });
    }

    const newBed = await prisma.hospitalBed.create({
      data: {
        hospitalId: hospital.id,
        bedNumber,
        ward: ward || WardType.GENERAL_WARD,
        status: BedStatus.AVAILABLE,
        notes: notes || '',
      },
    });

    // Update availableBeds count
    const avail = await prisma.hospitalBed.count({
      where: { hospitalId: hospital.id, status: BedStatus.AVAILABLE },
    });
    await prisma.hospital.update({
      where: { id: hospital.id },
      data: { availableBeds: avail },
    });

    const io = getIO();
    if (io) io.to('hospital_room').emit('hospital:bed_updated', newBed);

    return res.status(201).json(newBed);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to create bed' });
  }
});

// Update Bed status (Admit, Transfer, Discharge -> Cleaning, Maintenance)
router.put('/beds/:id', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || (req.user.role !== Role.ADMIN_HOSPITAL && req.user.role !== Role.SUPER_ADMIN)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { id } = req.params;
  const { status, patientName, patientId, assignedDoctor, notes, cleaningPriority, ward, bedNumber } = req.body;

  try {
    const hospital = await getAdminHospital(req.user.id, req.user.role);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found for this administrator' });
    }

    const bed = await prisma.hospitalBed.findUnique({ where: { id } });
    if (!bed) {
      return res.status(404).json({ message: 'Bed record not found' });
    }

    // IDOR / BOLA Prevention: Verify bed belongs to this admin's hospital
    if (req.user.role === Role.ADMIN_HOSPITAL && bed.hospitalId !== hospital.id) {
      return res.status(403).json({ message: 'Forbidden: Bed does not belong to your hospital' });
    }

    const updateData: any = {};
    if (ward) updateData.ward = ward;
    if (bedNumber) updateData.bedNumber = bedNumber;
    if (notes !== undefined) updateData.notes = notes;

    if (status) {
      updateData.status = status;

      if (status === BedStatus.OCCUPIED) {
        updateData.patientName = patientName || 'Admitted Patient';
        updateData.patientId = patientId || null;
        updateData.assignedDoctor = assignedDoctor || 'Staff Physician';
        updateData.admittedAt = new Date();
        updateData.cleaningPriority = null;
        updateData.cleanedBy = null;
      } else if (status === BedStatus.CLEANING) {
        // Patient discharged, bed vacated -> Needs sanitation
        updateData.cleaningPriority = cleaningPriority || 'URGENT';
        updateData.patientName = null;
        updateData.patientId = null;
        updateData.assignedDoctor = null;
        updateData.admittedAt = null;
      } else if (status === BedStatus.AVAILABLE) {
        updateData.patientName = null;
        updateData.patientId = null;
        updateData.assignedDoctor = null;
        updateData.cleaningPriority = null;
        updateData.admittedAt = null;
      }
    }

    const updatedBed = await prisma.hospitalBed.update({
      where: { id },
      data: updateData,
    });

    // Recalculate available count
    const avail = await prisma.hospitalBed.count({
      where: { hospitalId: bed.hospitalId, status: BedStatus.AVAILABLE },
    });
    await prisma.hospital.update({
      where: { id: bed.hospitalId },
      data: { availableBeds: avail },
    });

    const io = getIO();
    if (io) io.to('hospital_room').emit('hospital:bed_updated', updatedBed);

    // Record activity log for super admin monitoring
    await logAdminActivity(req.user!.id, 'BED_STATUS_UPDATED', {
      bedId: id,
      bedNumber: updatedBed.bedNumber,
      status: updatedBed.status,
      patientName: updatedBed.patientName || undefined,
      ward: updatedBed.ward,
    });

    return res.json(updatedBed);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to update bed' });
  }
});

// Housekeeping: Start Cleaning / Mark Sanitized & Ready
router.post('/beds/:id/clean', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || (req.user.role !== Role.ADMIN_HOSPITAL && req.user.role !== Role.SUPER_ADMIN)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { id } = req.params;
  const { action, cleanedBy } = req.body; // action: 'START' | 'COMPLETE'

  try {
    const hospital = await getAdminHospital(req.user.id, req.user.role);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found for this administrator' });
    }

    const bed = await prisma.hospitalBed.findUnique({ where: { id } });
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found' });
    }

    // IDOR / BOLA Prevention: Verify bed belongs to this admin's hospital
    if (req.user.role === Role.ADMIN_HOSPITAL && bed.hospitalId !== hospital.id) {
      return res.status(403).json({ message: 'Forbidden: Bed does not belong to your hospital' });
    }

    let updatedBed;
    if (action === 'START') {
      updatedBed = await prisma.hospitalBed.update({
        where: { id },
        data: {
          status: BedStatus.CLEANING,
          cleanedBy: cleanedBy || 'Housekeeping Staff',
        },
      });
    } else {
      // COMPLETE sanitation -> Ready for next patient
      updatedBed = await prisma.hospitalBed.update({
        where: { id },
        data: {
          status: BedStatus.AVAILABLE,
          cleanedBy: cleanedBy || bed.cleanedBy || 'Sanitation Team',
          lastCleanedAt: new Date(),
          cleaningPriority: null,
          patientName: null,
          patientId: null,
        },
      });

      // Update available count
      const avail = await prisma.hospitalBed.count({
        where: { hospitalId: bed.hospitalId, status: BedStatus.AVAILABLE },
      });
      await prisma.hospital.update({
        where: { id: bed.hospitalId },
        data: { availableBeds: avail },
      });
    }

    const io = getIO();
    if (io) io.to('hospital_room').emit('hospital:bed_updated', updatedBed);

    return res.json(updatedBed);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to update cleaning status' });
  }
});

// -------------------------------------------------------------
// Admissions & Bookings Hub Endpoints
// -------------------------------------------------------------

// List all admissions and bookings for the hospital
router.get('/bookings', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || (req.user.role !== Role.ADMIN_HOSPITAL && req.user.role !== Role.SUPER_ADMIN)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const hospital = await getAdminHospital(req.user.id, req.user.role);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    await ensureHospitalBeds(hospital.id);

    const bookings = await prisma.hospitalBooking.findMany({
      where: { hospitalId: hospital.id },
      include: {
        assignedBed: true,
        patient: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(bookings);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fetch bookings' });
  }
});

// Create new admission / booking (Admin walk-in or Patient booking)
router.post('/bookings', authenticate, async (req: AuthRequest, res) => {
  const {
    hospitalId,
    patientName,
    patientPhone,
    bookingType,
    department,
    doctorName,
    scheduledDate,
    triageLevel,
    symptoms,
    assignedBedId,
    notes,
  } = req.body;

  try {
    let targetHospitalId = hospitalId;
    if (!targetHospitalId) {
      const hospital = await getAdminHospital(req.user!.id, req.user!.role as Role);
      if (hospital) targetHospitalId = hospital.id;
    }

    if (!targetHospitalId) {
      return res.status(400).json({ message: 'Target hospital ID is required' });
    }

    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.hospitalBooking.create({
        data: {
          hospitalId: targetHospitalId,
          patientId: req.user?.role === Role.PATIENT ? req.user.id : null,
          patientName: patientName || req.user?.name || 'Walk-in Patient',
          patientPhone: patientPhone || '+15550000',
          bookingType: (bookingType as BookingType) || BookingType.EMERGENCY_ADMISSION,
          department: department || 'Emergency ER',
          doctorName: doctorName || 'Attending Physician',
          scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
          triageLevel: (triageLevel as TriageLevel) || TriageLevel.YELLOW_URGENT,
          symptoms: symptoms || '',
          assignedBedId: assignedBedId || null,
          notes: notes || '',
          status: assignedBedId ? BookingStatus.ADMITTED : BookingStatus.CONFIRMED,
        },
        include: { assignedBed: true, hospital: true },
      });

      // If a bed was designated immediately, mark it as OCCUPIED
      if (assignedBedId) {
        await tx.hospitalBed.update({
          where: { id: assignedBedId },
          data: {
            status: BedStatus.OCCUPIED,
            patientName: newBooking.patientName,
            patientId: newBooking.patientId,
            assignedDoctor: newBooking.doctorName,
            admittedAt: new Date(),
          },
        });

        // Recalculate available beds
        const avail = await tx.hospitalBed.count({
          where: { hospitalId: targetHospitalId, status: BedStatus.AVAILABLE },
        });
        await tx.hospital.update({
          where: { id: targetHospitalId },
          data: { availableBeds: avail },
        });
      }

      return newBooking;
    });

    const io = getIO();
    if (io) {
      io.to('hospital_room').emit('hospital:booking_created', booking);
    }

    return res.status(201).json(booking);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to create booking' });
  }
});

// Update booking status & bed assignment
router.put('/bookings/:id/status', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || (req.user.role !== Role.ADMIN_HOSPITAL && req.user.role !== Role.SUPER_ADMIN)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { id } = req.params;
  const { status, assignedBedId, doctorName, notes } = req.body;

  try {
    const hospital = await getAdminHospital(req.user.id, req.user.role);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found for this administrator' });
    }

    const booking = await prisma.hospitalBooking.findUnique({
      where: { id },
      include: { assignedBed: true },
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // IDOR / BOLA Prevention: Verify booking belongs to this admin's hospital
    if (req.user.role === Role.ADMIN_HOSPITAL && booking.hospitalId !== hospital.id) {
      return res.status(403).json({ message: 'Forbidden: Booking does not belong to your hospital' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (status) updateData.status = status;
      if (doctorName) updateData.doctorName = doctorName;
      if (notes !== undefined) updateData.notes = notes;
      if (assignedBedId !== undefined) updateData.assignedBedId = assignedBedId;

      const resBooking = await tx.hospitalBooking.update({
        where: { id },
        data: updateData,
        include: { assignedBed: true, hospital: true },
      });

      // If status changed to ADMITTED and bed is assigned
      if (status === BookingStatus.ADMITTED && (assignedBedId || booking.assignedBedId)) {
        const bedId = assignedBedId || booking.assignedBedId!;
        await tx.hospitalBed.update({
          where: { id: bedId },
          data: {
            status: BedStatus.OCCUPIED,
            patientName: resBooking.patientName,
            assignedDoctor: resBooking.doctorName,
            admittedAt: new Date(),
          },
        });
      }

      // If status changed to COMPLETED / CANCELLED and was previously assigned to a bed, free it for cleaning
      if ((status === BookingStatus.COMPLETED || status === BookingStatus.CANCELLED) && booking.assignedBedId) {
        await tx.hospitalBed.update({
          where: { id: booking.assignedBedId },
          data: {
            status: BedStatus.CLEANING,
            cleaningPriority: 'ROUTINE',
            patientName: null,
            assignedDoctor: null,
          },
        });
      }

      // Recalculate available count
      const avail = await tx.hospitalBed.count({
        where: { hospitalId: booking.hospitalId, status: BedStatus.AVAILABLE },
      });
      await tx.hospital.update({
        where: { id: booking.hospitalId },
        data: { availableBeds: avail },
      });

      return resBooking;
    });

    const io = getIO();
    if (io) {
      io.to('hospital_room').emit('hospital:booking_updated', updated);
    }

    await logAdminActivity(req.user!.id, 'PATIENT_ADMISSION_UPDATED', {
      bookingId: id,
      patientName: updated.patientName,
      status: updated.status,
      assignedBedId: updated.assignedBedId || undefined,
      doctorName: updated.doctorName || undefined,
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to update booking status' });
  }
});

// -------------------------------------------------------------
// Inbound Emergency Bay Allocation
// -------------------------------------------------------------

// Assign specific ER Bay / Bed to an incoming ambulance dispatch
router.post('/requests/:id/assign-bay', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || (req.user.role !== Role.ADMIN_HOSPITAL && req.user.role !== Role.SUPER_ADMIN)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { id } = req.params;
  const { assignedBay, bedId, doctorName } = req.body;

  try {
    const hospital = await getAdminHospital(req.user.id, req.user.role);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found for this administrator' });
    }

    const request = await prisma.emergencyRequest.findUnique({
      where: { id },
      include: { patient: true, driver: true, hospital: true },
    });

    if (!request) {
      return res.status(404).json({ message: 'Emergency dispatch request not found' });
    }

    // IDOR / BOLA Prevention: Verify request is for this admin's hospital
    if (req.user.role === Role.ADMIN_HOSPITAL && request.hospitalId !== hospital.id) {
      return res.status(403).json({ message: 'Forbidden: Emergency request is not directed to your hospital' });
    }

    // Update request with assignedBay
    const updatedRequest = await prisma.emergencyRequest.update({
      where: { id },
      data: {
        assignedBay: assignedBay || 'ER Trauma Bay 1',
      },
    });

    // If a bed was selected, mark it as RESERVED for this inbound rig
    if (bedId) {
      await prisma.hospitalBed.update({
        where: { id: bedId },
        data: {
          status: BedStatus.RESERVED,
          patientName: request.patient.name,
          assignedDoctor: doctorName || 'ER Trauma Team On-Call',
          notes: `Reserved for inbound dispatch (${assignedBay || 'Resus Bay'})`,
        },
      });
    }

    const payload = {
      requestId: id,
      assignedBay: updatedRequest.assignedBay,
      doctorName: doctorName || 'Dr. Sarah Connor (Trauma Surgeon)',
      hospitalName: request.hospital.name,
    };

    // Broadcast to driver and patient in real-time
    if (request.driverId) {
      broadcastToDriver(request.driverId, 'hospital:bay_assigned', payload);
    }
    broadcastToPatient(request.patientId, 'hospital:bay_assigned', payload);

    const io = getIO();
    if (io) {
      io.to('hospital_room').emit('hospital:bay_assigned', payload);
    }

    await logAdminActivity(req.user!.id, 'EMERGENCY_BAY_ALLOCATED', {
      requestId: id,
      assignedBay: updatedRequest.assignedBay,
      patientName: request.patient.name,
      driverName: request.driver?.name || 'Assigned Driver',
      doctorName: payload.doctorName,
      hospitalName: request.hospital.name,
    });

    return res.json({ success: true, request: updatedRequest, bayInfo: payload });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to assign ER bay' });
  }
});

// List all hospitals
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const hospitals = await prisma.hospital.findMany();
    return res.json(hospitals);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update beds count (Admin of specific hospital only)
router.put('/beds', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== 'ADMIN_HOSPITAL') {
    return res.status(403).json({ message: 'Forbidden: Only hospital admins can manage beds' });
  }

  const { availableBeds } = req.body;

  try {
    const hospital = await prisma.hospital.update({
      where: { adminUserId: req.user.id },
      data: {
        availableBeds: parseInt(availableBeds) || 0,
      },
    });
    return res.json(hospital);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// 1. GET Hospital Drivers Roster
router.get('/drivers', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== 'ADMIN_HOSPITAL') {
    return res.status(403).json({ message: 'Forbidden: Only hospital admins can view roster' });
  }

  try {
    const hospital = await getAdminHospital(req.user.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not configured for this admin' });
    }

    const drivers = await prisma.user.findMany({
      where: {
        hospitalId: hospital.id,
        role: Role.DRIVER,
      },
      include: {
        ambulance: true,
      },
      orderBy: { name: 'asc' },
    });

    // Hide password hashes
    const safeDrivers = drivers.map((d) => {
      const { passwordHash, ...safe } = d;
      return safe;
    });

    return res.json(safeDrivers);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// 2. PUT Verify Driver Documents
router.put('/drivers/:driverId/verify', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== 'ADMIN_HOSPITAL') {
    return res.status(403).json({ message: 'Forbidden: Only hospital admins can verify drivers' });
  }

  const { driverId } = req.params;
  const { status } = req.body; // 'APPROVED' or 'REJECTED' or 'PENDING'

  try {
    const hospital = await getAdminHospital(req.user.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not configured for this admin' });
    }

    // Verify driver belongs to this hospital
    const driver = await prisma.user.findFirst({
      where: { id: driverId, hospitalId: hospital.id, role: Role.DRIVER },
    });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found in this hospital roster' });
    }

    const updatedAmbulance = await prisma.ambulance.update({
      where: { driverId: driver.id },
      data: {
        verificationStatus: status,
      },
    });

    return res.json(updatedAmbulance);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// 3. PUT Toggle Driver Account Status (Active/Inactive)
router.put('/drivers/:driverId/status', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== 'ADMIN_HOSPITAL') {
    return res.status(403).json({ message: 'Forbidden: Only hospital admins can toggle driver accounts' });
  }

  const { driverId } = req.params;
  const { isActive } = req.body;

  try {
    const hospital = await getAdminHospital(req.user.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not configured' });
    }

    const driver = await prisma.user.findFirst({
      where: { id: driverId, hospitalId: hospital.id, role: Role.DRIVER },
    });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found in this hospital roster' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: driverId },
      data: {
        isActive: !!isActive,
      },
    });

    const { passwordHash, ...safeUser } = updatedUser;
    return res.json(safeUser);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// 4. GET Hospital Ambulance Fleet
router.get('/ambulances', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== 'ADMIN_HOSPITAL') {
    return res.status(403).json({ message: 'Forbidden: Only hospital admins can manage fleet' });
  }

  try {
    const hospital = await getAdminHospital(req.user.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not configured' });
    }

    const fleet = await prisma.ambulance.findMany({
      where: { hospitalId: hospital.id },
      include: {
        driver: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { vehicleNumber: 'asc' },
    });

    return res.json(fleet);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// 5. POST Register New Ambulance
router.post('/ambulances', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== 'ADMIN_HOSPITAL') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { vehicleNumber, ambulanceType } = req.body;

  try {
    const hospital = await getAdminHospital(req.user.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not configured' });
    }

    const existingAmb = await prisma.ambulance.findFirst({
      where: { vehicleNumber },
    });
    if (existingAmb) {
      return res.status(400).json({ message: 'Vehicle number already registered on the platform' });
    }

    const newAmbulance = await prisma.ambulance.create({
      data: {
        vehicleNumber,
        ambulanceType,
        hospitalId: hospital.id,
        isAvailable: false,
        currentLat: hospital.lat,
        currentLng: hospital.lng,
        verificationStatus: 'APPROVED', // Registered directly by the hospital admin
      },
    });

    return res.status(201).json(newAmbulance);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// 6. PUT Edit Ambulance details (assign driver / toggle maintenance status)
router.put('/ambulances/:id', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== 'ADMIN_HOSPITAL') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { id } = req.params;
  const { driverId, maintenanceStatus } = req.body;

  try {
    const hospital = await getAdminHospital(req.user.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not configured' });
    }

    // Verify ambulance belongs to hospital
    const ambulance = await prisma.ambulance.findFirst({
      where: { id, hospitalId: hospital.id },
    });

    if (!ambulance) {
      return res.status(404).json({ message: 'Ambulance not found in this hospital fleet' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // If assigning a new driver
      if (driverId !== undefined) {
        if (driverId) {
          // Verify target driver is in the roster
          const targetDriver = await tx.user.findFirst({
            where: { id: driverId, hospitalId: hospital.id, role: Role.DRIVER },
          });

          if (!targetDriver) {
            throw new Error('Target driver is not in your hospital roster');
          }

          // Unassign this driver from any other ambulance (prevent unique constraint violations)
          await tx.ambulance.updateMany({
            where: { driverId },
            data: { driverId: null },
          });
        }

        // If this ambulance had another driver assigned, we can unassign them first or let Prisma replace
        // Since driverId is unique, we must update the record directly
        return tx.ambulance.update({
          where: { id },
          data: {
            driverId: driverId || null,
            maintenanceStatus: maintenanceStatus || ambulance.maintenanceStatus,
          },
          include: { driver: true },
        });
      }

      // Just update maintenance status
      return tx.ambulance.update({
        where: { id },
        data: {
          maintenanceStatus: maintenanceStatus || ambulance.maintenanceStatus,
        },
        include: { driver: true },
      });
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// -------------------------------------------------------------
// Real hospitals near the user from OpenStreetMap (free, no API key)
// -------------------------------------------------------------
const osmCache = new Map<string, { time: number; data: any[] }>();

router.get('/nearby-osm', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radiusKm = Math.min(parseFloat((req.query.radius as string) || '15') || 15, 25);
    const search = (req.query.search as string | undefined)?.trim().toLowerCase();

    if (isNaN(lat) || isNaN(lng)) {
      return res.json({ count: 0, hospitals: [] });
    }

    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)},${radiusKm}`;
    const cached = osmCache.get(cacheKey);
    let list: any[];

    if (cached && Date.now() - cached.time < 10 * 60 * 1000) {
      list = cached.data;
    } else {
      const around = `around:${radiusKm * 1000},${lat},${lng}`;
      const query = `[out:json][timeout:20];(node["amenity"="hospital"](${around});way["amenity"="hospital"](${around}););out center tags;`;

      const fetchFn: any = (globalThis as any).fetch;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const response = await fetchFn('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'LifeLink-App/1.0',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Overpass error ${response.status}`);
      }
      const json: any = await response.json();

      list = (json.elements || [])
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
            doctors: [],
            isRegistered: false,
            source: 'openstreetmap',
          };
        })
        .filter(Boolean);

      osmCache.set(cacheKey, { time: Date.now(), data: list });
    }

    let results = list
      .map((h: any) => {
        const d = haversineDistanceKm(lat, lng, h.lat, h.lng);
        return {
          ...h,
          distanceKm: Math.round(d * 100) / 100,
          distanceLabel: formatDistance(d),
        };
      })
      .filter((h: any) => h.distanceKm <= radiusKm);

    if (search) {
      results = results.filter(
        (h: any) =>
          h.name.toLowerCase().includes(search) ||
          h.address.toLowerCase().includes(search)
      );
    }

    results.sort((a: any, b: any) => a.distanceKm - b.distanceKm);

    return res.json({ count: results.length, hospitals: results });
  } catch (error: any) {
    console.error('OSM hospital fetch failed:', error?.message || error);
    return res.json({ count: 0, hospitals: [], error: 'Real hospitals could not be loaded' });
  }
});
export default router;
