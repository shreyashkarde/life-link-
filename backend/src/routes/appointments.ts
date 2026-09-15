import { Router } from 'express';
import { AppointmentStatus, Role } from '@prisma/client';
import prisma from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/appointments - Book an appointment with atomic concurrency protection
router.post('/', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const patientId = req.user.id;
  const { slotId, symptoms, notes } = req.body;

  if (!slotId) {
    return res.status(400).json({ message: 'slotId is required' });
  }

  try {
    const newAppointment = await prisma.$transaction(async (tx) => {
      // 1. Verify slot exists and get capacity info
      const slot = await tx.doctorSlot.findUnique({
        where: { id: slotId },
        include: {
          doctor: {
            include: {
              hospital: true,
            },
          },
        },
      });

      if (!slot) {
        throw new Error('DOCTOR_SLOT_NOT_FOUND');
      }

      if (!slot.doctor.isActive) {
        throw new Error('DOCTOR_INACTIVE');
      }

      // 2. Prevent duplicate active booking by the same patient for the same slot
      const existingPatientBooking = await tx.appointment.findFirst({
        where: {
          slotId,
          patientId,
          status: AppointmentStatus.BOOKED,
        },
      });

      if (existingPatientBooking) {
        throw new Error('DUPLICATE_BOOKING');
      }

      // 3. Concurrency Protection:
      // Atomic check-and-increment conditional update at the database level.
      // If multiple requests arrive simultaneously, PostgreSQL evaluates `bookedCount < maxPatients`
      // under row-level update lock. If bookedCount has reached maxPatients, updateResult.count will be 0.
      const updateResult = await tx.doctorSlot.updateMany({
        where: {
          id: slotId,
          bookedCount: { lt: slot.maxPatients },
        },
        data: {
          bookedCount: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        throw new Error('SLOT_FULLY_BOOKED');
      }

      // 4. Generate sequential token number
      const existingAppointmentsCount = await tx.appointment.count({
        where: { slotId },
      });
      const tokenNumber = existingAppointmentsCount + 1;

      // 5. Create the appointment record
      const appointment = await tx.appointment.create({
        data: {
          hospitalId: slot.doctor.hospitalId,
          doctorId: slot.doctorId,
          slotId: slot.id,
          patientId,
          tokenNumber,
          status: AppointmentStatus.BOOKED,
          symptoms: symptoms ? String(symptoms).trim() : null,
          notes: notes ? String(notes).trim() : null,
        },
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              specialization: true,
              consultationFee: true,
            },
          },
          slot: {
            select: {
              id: true,
              date: true,
              startTime: true,
              endTime: true,
              maxPatients: true,
              bookedCount: true,
            },
          },
          hospital: {
            select: {
              id: true,
              name: true,
              address: true,
              contactNumber: true,
            },
          },
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      return appointment;
    });

    return res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: newAppointment,
      tokenNumber: newAppointment.tokenNumber,
    });
  } catch (error: any) {
    if (error.message === 'DOCTOR_SLOT_NOT_FOUND') {
      return res.status(404).json({ message: 'Selected doctor slot was not found' });
    }
    if (error.message === 'DOCTOR_INACTIVE') {
      return res.status(400).json({ message: 'Doctor is currently inactive' });
    }
    if (error.message === 'DUPLICATE_BOOKING') {
      return res.status(409).json({ message: 'You already have an active booking for this time slot' });
    }
    if (error.message === 'SLOT_FULLY_BOOKED') {
      return res.status(409).json({ message: 'Slot is fully booked. Please choose another time slot or doctor.' });
    }
    return res.status(500).json({ message: error.message || 'Failed to book appointment' });
  }
});

// GET /api/appointments/my - Get all appointments for logged-in patient
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const appointments = await prisma.appointment.findMany({
      where: { patientId: req.user.id },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            consultationFee: true,
          },
        },
        slot: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
          },
        },
        hospital: {
          select: {
            id: true,
            name: true,
            address: true,
            contactNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(appointments);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fetch appointments' });
  }
});

// PUT /api/appointments/:id/cancel - Cancel appointment
router.put('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id },
        include: { slot: true },
      });

      if (!appointment) {
        throw new Error('NOT_FOUND');
      }

      // Check permission: Patient who booked, or Hospital Admin of the hospital, or Super Admin
      const isOwner = appointment.patientId === req.user!.id;
      const isAdmin = req.user!.role === Role.ADMIN_HOSPITAL || req.user!.role === Role.SUPER_ADMIN;

      if (!isOwner && !isAdmin) {
        throw new Error('FORBIDDEN');
      }

      if (appointment.status === AppointmentStatus.CANCELLED) {
        throw new Error('ALREADY_CANCELLED');
      }

      // Update appointment status to CANCELLED
      const updated = await tx.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.CANCELLED },
      });

      // Safely decrement bookedCount on slot
      if (appointment.slot.bookedCount > 0) {
        await tx.doctorSlot.update({
          where: { id: appointment.slotId },
          data: { bookedCount: { decrement: 1 } },
        });
      }

      return updated;
    });

    return res.json({ message: 'Appointment cancelled successfully', appointment: result });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    if (error.message === 'FORBIDDEN') {
      return res.status(403).json({ message: 'You do not have permission to cancel this appointment' });
    }
    if (error.message === 'ALREADY_CANCELLED') {
      return res.status(400).json({ message: 'Appointment is already cancelled' });
    }
    return res.status(500).json({ message: error.message || 'Failed to cancel appointment' });
  }
});

// PUT /api/appointments/:id/status - Update status (e.g. COMPLETED) for hospital admin
router.put('/:id/status', authenticate, async (req: AuthRequest, res) => {
  if (!req.user || (req.user.role !== Role.ADMIN_HOSPITAL && req.user.role !== Role.SUPER_ADMIN)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { id } = req.params;
  const { status } = req.body;

  if (!status || !Object.values(AppointmentStatus).includes(status)) {
    return res.status(400).json({ message: 'Invalid appointment status' });
  }

  try {
    const updated = await prisma.appointment.update({
      where: { id },
      data: { status },
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to update appointment status' });
  }
});

export default router;
