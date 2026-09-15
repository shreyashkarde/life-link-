import { Router } from 'express';
import { Role } from '@prisma/client';
import prisma from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { MEDICAL_SPECIALIZATIONS } from '../constants/specializations';

const router = Router();

// Helper to resolve the hospital managed by the logged-in admin
async function getAdminHospital(userId: string, role?: Role) {
  if (role === Role.ADMIN_HOSPITAL) {
    return prisma.hospital.findUnique({
      where: { adminUserId: userId },
    });
  }
  if (role === Role.SUPER_ADMIN) {
    const direct = await prisma.hospital.findUnique({
      where: { adminUserId: userId },
    });
    if (direct) return direct;
    return prisma.hospital.findFirst();
  }
  return null;
}

// -------------------------------------------------------------
// Public & Patient Doctor Endpoints
// -------------------------------------------------------------

// GET /api/doctors - List active doctors, filterable by hospitalId and/or specialization
router.get('/', async (req, res) => {
  try {
    const hospitalId = req.query.hospitalId as string | undefined;
    const specialization = req.query.specialization as string | undefined;
    const search = (req.query.search as string | undefined)?.trim().toLowerCase();

    const whereClause: any = { isActive: true };
    if (hospitalId) whereClause.hospitalId = hospitalId;
    if (specialization) whereClause.specialization = specialization;

    const doctors = await prisma.doctor.findMany({
      where: whereClause,
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            address: true,
            contactNumber: true,
            lat: true,
            lng: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (search) {
      const filtered = doctors.filter(
        (d) =>
          d.name.toLowerCase().includes(search) ||
          d.specialization.toLowerCase().includes(search) ||
          (d.qualifications && d.qualifications.toLowerCase().includes(search))
      );
      return res.json(filtered);
    }

    return res.json(doctors);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fetch doctors' });
  }
});

// GET /api/doctors/specializations - List available specializations
router.get('/specializations', (req, res) => {
  return res.json(MEDICAL_SPECIALIZATIONS);
});

// GET /api/doctors/:id - Get single doctor details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            address: true,
            contactNumber: true,
            lat: true,
            lng: true,
          },
        },
      },
    });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    return res.json(doctor);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fetch doctor' });
  }
});

// GET /api/doctors/:id/slots?date=YYYY-MM-DD
// PATIENT PRIVACY GUARANTEE: Returns ONLY remaining capacity count and availability. NEVER patient identities!
router.get('/:id/slots', async (req, res) => {
  try {
    const { id: doctorId } = req.params;
    const date = req.query.date as string | undefined;

    if (!date) {
      return res.status(400).json({ message: 'Query parameter "date" (YYYY-MM-DD) is required' });
    }

    // Verify doctor exists and is active
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, name: true, specialization: true, hospitalId: true, isActive: true },
    });

    if (!doctor || !doctor.isActive) {
      return res.status(404).json({ message: 'Doctor not found or currently inactive' });
    }

    const slots = await prisma.doctorSlot.findMany({
      where: {
        doctorId,
        date,
      },
      orderBy: { startTime: 'asc' },
    });

    // Strip sensitive info: return ONLY slot timing and remaining capacity
    const sanitizedSlots = slots.map((s) => {
      const remainingCapacity = Math.max(0, s.maxPatients - s.bookedCount);
      return {
        id: s.id,
        doctorId: s.doctorId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        maxPatients: s.maxPatients,
        bookedCount: s.bookedCount,
        remainingCapacity,
        isAvailable: remainingCapacity > 0,
      };
    });

    return res.json({
      doctorId,
      doctorName: doctor.name,
      specialization: doctor.specialization,
      date,
      slots: sanitizedSlots,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fetch doctor slots' });
  }
});

// -------------------------------------------------------------
// Hospital Admin Management Endpoints
// -------------------------------------------------------------

// POST /api/doctors - Add doctor to admin's hospital
router.post('/', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || (req.user.role !== Role.ADMIN_HOSPITAL && req.user.role !== Role.SUPER_ADMIN)) {
    return res.status(403).json({ message: 'Forbidden: Only hospital administrators can add doctors' });
  }

  try {
    const hospital = await getAdminHospital(req.user.id, req.user.role);
    if (!hospital) {
      return res.status(404).json({ message: 'Admin hospital not found' });
    }

    const { name, specialization, qualifications, experienceYears, consultationFee } = req.body;

    if (!name || !specialization) {
      return res.status(400).json({ message: 'Name and specialization are required' });
    }

    const doctor = await prisma.doctor.create({
      data: {
        hospitalId: hospital.id,
        name: name.trim(),
        specialization: specialization.trim(),
        qualifications: qualifications ? String(qualifications).trim() : null,
        experienceYears: experienceYears ? parseInt(experienceYears) : 0,
        consultationFee: consultationFee ? parseFloat(consultationFee) : 0,
        isActive: true,
      },
    });

    return res.status(201).json(doctor);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to create doctor' });
  }
});

// PUT /api/doctors/:id - Update doctor details (must belong to admin's hospital)
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || (req.user.role !== Role.ADMIN_HOSPITAL && req.user.role !== Role.SUPER_ADMIN)) {
    return res.status(403).json({ message: 'Forbidden: Only hospital administrators can update doctors' });
  }

  try {
    const hospital = await getAdminHospital(req.user.id, req.user.role);
    if (!hospital) {
      return res.status(404).json({ message: 'Admin hospital not found' });
    }

    const { id } = req.params;
    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing || existing.hospitalId !== hospital.id) {
      return res.status(404).json({ message: 'Doctor not found in your hospital' });
    }

    const { name, specialization, qualifications, experienceYears, consultationFee, isActive } = req.body;

    const updated = await prisma.doctor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(specialization !== undefined && { specialization: specialization.trim() }),
        ...(qualifications !== undefined && { qualifications: String(qualifications).trim() }),
        ...(experienceYears !== undefined && { experienceYears: parseInt(experienceYears) }),
        ...(consultationFee !== undefined && { consultationFee: parseFloat(consultationFee) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to update doctor' });
  }
});

// DELETE /api/doctors/:id - Deactivate doctor
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || (req.user.role !== Role.ADMIN_HOSPITAL && req.user.role !== Role.SUPER_ADMIN)) {
    return res.status(403).json({ message: 'Forbidden: Only hospital administrators can manage doctors' });
  }

  try {
    const hospital = await getAdminHospital(req.user.id, req.user.role);
    if (!hospital) {
      return res.status(404).json({ message: 'Admin hospital not found' });
    }

    const { id } = req.params;
    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing || existing.hospitalId !== hospital.id) {
      return res.status(404).json({ message: 'Doctor not found in your hospital' });
    }

    // Soft delete / set inactive to protect foreign key integrity for appointments
    const updated = await prisma.doctor.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({ message: 'Doctor deactivated successfully', doctor: updated });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to deactivate doctor' });
  }
});

// POST /api/doctors/:id/slots - Hospital Admin creates a slot for a doctor
router.post('/:id/slots', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || (req.user.role !== Role.ADMIN_HOSPITAL && req.user.role !== Role.SUPER_ADMIN)) {
    return res.status(403).json({ message: 'Forbidden: Only hospital administrators can create slots' });
  }

  try {
    const hospital = await getAdminHospital(req.user.id, req.user.role);
    if (!hospital) {
      return res.status(404).json({ message: 'Admin hospital not found' });
    }

    const { id: doctorId } = req.params;
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor || doctor.hospitalId !== hospital.id) {
      return res.status(404).json({ message: 'Doctor not found in your hospital' });
    }

    const { date, startTime, endTime, maxPatients } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Date (YYYY-MM-DD), startTime (HH:MM), and endTime (HH:MM) are required' });
    }

    const capacity = maxPatients ? parseInt(maxPatients) : 5;
    if (isNaN(capacity) || capacity <= 0) {
      return res.status(400).json({ message: 'maxPatients must be a positive integer' });
    }

    // Check if slot already exists
    const existingSlot = await prisma.doctorSlot.findUnique({
      where: {
        doctorId_date_startTime: {
          doctorId,
          date,
          startTime,
        },
      },
    });

    if (existingSlot) {
      return res.status(409).json({ message: 'A slot for this doctor at this date and start time already exists' });
    }

    const newSlot = await prisma.doctorSlot.create({
      data: {
        doctorId,
        date,
        startTime,
        endTime,
        maxPatients: capacity,
        bookedCount: 0,
      },
    });

    return res.status(201).json(newSlot);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to create doctor slot' });
  }
});

// GET /api/doctors/hospital/slots - Admin daily appointments roster with patient identities
// Renders day's slots table with Capacity | Booked | Remaining and reveals booked patient details
router.get('/hospital/slots', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || (req.user.role !== Role.ADMIN_HOSPITAL && req.user.role !== Role.SUPER_ADMIN)) {
    return res.status(403).json({ message: 'Forbidden: Only hospital administrators can view hospital slots' });
  }

  try {
    const hospital = await getAdminHospital(req.user.id, req.user.role);
    if (!hospital) {
      return res.status(404).json({ message: 'Admin hospital not found' });
    }

    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const doctorId = req.query.doctorId as string | undefined;

    const whereSlot: any = {
      date,
      doctor: { hospitalId: hospital.id },
    };
    if (doctorId) {
      whereSlot.doctorId = doctorId;
    }

    const slots = await prisma.doctorSlot.findMany({
      where: whereSlot,
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
        appointments: {
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                patientProfile: {
                  select: { bloodGroup: true, allergies: true, emergencyContactPhone: true },
                },
              },
            },
          },
          orderBy: { tokenNumber: 'asc' },
        },
      },
      orderBy: [{ startTime: 'asc' }],
    });

    const enriched = slots.map((slot) => ({
      id: slot.id,
      doctorId: slot.doctorId,
      doctorName: slot.doctor.name,
      specialization: slot.doctor.specialization,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.maxPatients,
      booked: slot.bookedCount,
      remaining: Math.max(0, slot.maxPatients - slot.bookedCount),
      patients: slot.appointments.map((apt) => ({
        appointmentId: apt.id,
        tokenNumber: apt.tokenNumber,
        status: apt.status,
        symptoms: apt.symptoms,
        patientId: apt.patient.id,
        patientName: apt.patient.name,
        patientEmail: apt.patient.email,
        patientPhone: apt.patient.phone || apt.patient.patientProfile?.emergencyContactPhone || 'N/A',
        bloodGroup: apt.patient.patientProfile?.bloodGroup || 'N/A',
        allergies: apt.patient.patientProfile?.allergies || 'None',
        bookedAt: apt.createdAt,
      })),
    }));

    return res.json({
      date,
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      slots: enriched,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fetch hospital slots' });
  }
});

// DELETE /api/doctors/slots/:slotId - Hospital Admin removes a slot
router.delete('/slots/:slotId', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || (req.user.role !== Role.ADMIN_HOSPITAL && req.user.role !== Role.SUPER_ADMIN)) {
    return res.status(403).json({ message: 'Forbidden: Only hospital administrators can delete slots' });
  }

  try {
    const hospital = await getAdminHospital(req.user.id, req.user.role);
    if (!hospital) {
      return res.status(404).json({ message: 'Admin hospital not found' });
    }

    const { slotId } = req.params;
    const slot = await prisma.doctorSlot.findUnique({
      where: { id: slotId },
      include: { doctor: true, appointments: true },
    });

    if (!slot || slot.doctor.hospitalId !== hospital.id) {
      return res.status(404).json({ message: 'Slot not found in your hospital' });
    }

    if (slot.bookedCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete slot with active bookings. Cancel appointments first.',
        bookedCount: slot.bookedCount,
      });
    }

    await prisma.doctorSlot.delete({ where: { id: slotId } });

    return res.json({ message: 'Slot deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to delete slot' });
  }
});

export default router;
