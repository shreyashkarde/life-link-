import express, { Request, Response } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { prescriptoStore } from '../config/prescriptoStore';
import { getIO } from '../socket/socketHandler';

const normalizeDocId = (id: string): string => {
  if (!id) return '';
  return id.includes('_') ? id : id.replace(/^doc(\d+)/, 'doc_$1');
};

const roleRouter = express.Router();

// Mock store for hospitals & hospital staff
const hospitalStore = {
  hospitals: [
    {
      id: 'hosp_lilavati',
      name: 'Lilavati Hospital & Research Centre',
      address: 'Bandra Reclamation, Bandra West, Mumbai',
      traumaLevel: 'Level 1 Trauma Center',
      totalBeds: 323,
      icuBedsAvailable: 14,
      adminEmail: 'hospital@prescripto.com',
      doctorsCount: 1,
      driversCount: 1,
    },
  ],
  hospitalAdmins: [
    {
      id: 'hadmin_lilavati',
      email: 'hospital@prescripto.com',
      hospitalId: 'hosp_lilavati',
      name: 'Dr. Mehra (Lilavati Admin)',
    },
  ],
  drivers: [
    {
      id: 'driver_108',
      hospitalId: 'hosp_lilavati',
      name: 'Rajesh Kumar',
      phone: '+91 98765 43210',
      vehicleNumber: 'MH-01-EQ-1108',
      type: 'ALS Paramedic',
      isAvailable: true,
    },
  ],
  trips: [
    {
      id: 'trip_108992',
      bookingId: 'SOS-108992',
      patientId: 'user_edward_101',
      patientName: 'Edward Vincent',
      patientPhone: '+91 98765 43210',
      pickupLocation: { latitude: 19.0600, longitude: 72.8340, address: 'Bandra West Junction' },
      hospitalId: 'hosp_lilavati',
      hospitalName: 'Lilavati Hospital & Research Centre',
      driverId: 'driver_108',
      driverName: 'Rajesh Kumar',
      vehicleNumber: 'MH-01-EQ-1108',
      status: 'ASSIGNED', // ASSIGNED, EN_ROUTE_PICKUP, PATIENT_ONBOARD, COMPLETED, REJECTED
      createdAt: new Date().toISOString(),
    },
  ],
  prescriptions: new Map<string, any>(),
};

// ========================================================
// 🏢 1. SUPER ADMIN (ONLY System-Level Hospital Manager)
// ========================================================
roleRouter.get(
  '/system/hospitals',
  authenticateJWT,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  (_req: Request, res: Response): void => {
    res.json({
      success: true,
      message: 'Super Admin: All system hospitals retrieved',
      totalHospitals: hospitalStore.hospitals.length,
      hospitals: hospitalStore.hospitals,
    });
  }
);

roleRouter.post(
  '/system/hospitals',
  authenticateJWT,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  (req: Request, res: Response): void => {
    const { name, address, traumaLevel, totalBeds, icuBedsAvailable } = req.body;
    if (!name || !address) {
      res.status(400).json({ success: false, message: 'Hospital name and address are required' });
      return;
    }

    const newHosp = {
      id: `hosp_${Date.now()}`,
      name,
      address,
      traumaLevel: traumaLevel || 'Level 2 Trauma Center',
      totalBeds: totalBeds || 100,
      icuBedsAvailable: icuBedsAvailable || 10,
      adminEmail: '',
      doctorsCount: 0,
      driversCount: 0,
    };

    hospitalStore.hospitals.push(newHosp);
    res.status(201).json({ success: true, message: 'Hospital registered successfully', hospital: newHosp });
  }
);

roleRouter.post(
  '/system/hospital-admins',
  authenticateJWT,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  (req: Request, res: Response): void => {
    const { email, hospitalId, name } = req.body;
    if (!email || !hospitalId) {
      res.status(400).json({ success: false, message: 'Email and hospitalId are required' });
      return;
    }

    const newAdmin = {
      id: `hadmin_${Date.now()}`,
      email,
      hospitalId,
      name: name || 'Hospital Admin',
    };
    hospitalStore.hospitalAdmins.push(newAdmin);
    res.status(201).json({ success: true, message: 'Hospital Admin account created successfully', admin: newAdmin });
  }
);

// ========================================================
// 🏥 2. HOSPITAL ADMIN (Staff Manager of One Hospital)
// ========================================================
roleRouter.get(
  '/hospital/staff',
  authenticateJWT,
  requireRole('HOSPITAL_ADMIN', 'ADMIN_HOSPITAL'),
  (req: Request, res: Response): void => {
    // Hospital admin only sees staff assigned to their specific hospital
    const adminEmail = req.user?.email;
    const adminRecord = hospitalStore.hospitalAdmins.find((a) => a.email === adminEmail) || hospitalStore.hospitalAdmins[0];
    const hospitalId = adminRecord?.hospitalId || 'hosp_lilavati';

    const hospital = hospitalStore.hospitals.find((h) => h.id === hospitalId);
    const assignedDrivers = hospitalStore.drivers.filter((d) => d.hospitalId === hospitalId);

    res.json({
      success: true,
      hospital,
      drivers: assignedDrivers,
      doctorsCount: hospital?.doctorsCount || 8,
    });
  }
);

roleRouter.post(
  '/hospital/drivers',
  authenticateJWT,
  requireRole('HOSPITAL_ADMIN', 'ADMIN_HOSPITAL'),
  (req: Request, res: Response): void => {
    const { name, phone, vehicleNumber, type } = req.body;
    const newDriver = {
      id: `driver_${Date.now()}`,
      hospitalId: 'hosp_lilavati',
      name: name || 'Paramedic Driver',
      phone: phone || '+91 90000 00000',
      vehicleNumber: vehicleNumber || 'MH-01-EQ-9999',
      type: type || 'ALS Paramedic',
      isAvailable: true,
    };
    hospitalStore.drivers.push(newDriver);
    res.status(201).json({ success: true, message: 'Driver recruited for hospital', driver: newDriver });
  }
);

// ========================================================
// 🚑 3. DRIVER (Ambulance Partner - Real-Time Tasks)
// ========================================================
roleRouter.get(
  '/driver/requests',
  authenticateJWT,
  requireRole('DRIVER'),
  (req: Request, res: Response): void => {
    const driverId = req.user?.id || 'driver_108';
    // Active trips assigned to this driver
    const driverTrips = hospitalStore.trips.filter((t) => t.driverId === driverId || t.driverId === 'driver_108');
    res.json({
      success: true,
      trips: driverTrips,
    });
  }
);

roleRouter.post(
  '/driver/trips/:tripId/status',
  authenticateJWT,
  requireRole('DRIVER'),
  (req: Request, res: Response): void => {
    const { tripId } = req.params;
    const { status } = req.body; // 'EN_ROUTE_PICKUP' | 'PATIENT_ONBOARD' | 'COMPLETED'

    const trip = hospitalStore.trips.find((t) => t.id === tripId || t.bookingId === tripId);
    if (!trip) {
      res.status(404).json({ success: false, message: 'Trip not found' });
      return;
    }

    trip.status = status;

    // Emit real-time status update to patient room
    const io = getIO();
    if (io) {
      io.to(`patient_${trip.patientId}`).emit('tripStatusUpdated', {
        tripId: trip.id,
        bookingId: trip.bookingId,
        status,
        updatedAt: new Date().toISOString(),
      });
      io.to(`ride_${trip.bookingId}`).emit('tripStatusUpdated', {
        tripId: trip.id,
        bookingId: trip.bookingId,
        status,
        updatedAt: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: `Trip status updated to ${status}`,
      trip,
    });
  }
);

// ========================================================
// 👨‍⚕️ 4. DOCTOR (Consultation Handler Only)
// ========================================================
roleRouter.get(
  '/doctor/my-appointments',
  authenticateJWT,
  requireRole('DOCTOR'),
  (req: Request, res: Response): void => {
    const doctorId = req.user?.id || 'doc1';
    const normalized = normalizeDocId(doctorId);

    const appointments = prescriptoStore.appointments.filter(
      (a) => a.docId === doctorId || a.docId === normalized || a.docData?._id === doctorId || a.docData?._id === normalized
    );

    res.json({
      success: true,
      doctorId,
      count: appointments.length,
      appointments,
    });
  }
);

roleRouter.post(
  '/doctor/appointments/:id/prescription',
  authenticateJWT,
  requireRole('DOCTOR'),
  (req: Request, res: Response): void => {
    const { id } = req.params;
    const { diagnosis, medicines, dosageInstructions, notes } = req.body;

    const prescription = {
      appointmentId: id,
      doctorId: req.user?.id,
      diagnosis,
      medicines: medicines || [],
      dosageInstructions: dosageInstructions || '',
      notes: notes || '',
      issuedAt: new Date().toISOString(),
    };

    hospitalStore.prescriptions.set(id, prescription);

    // Notify patient in real-time
    const appt = prescriptoStore.appointments.find((a) => a._id === id || a.id === id);
    const io = getIO();
    if (io && appt?.userId) {
      io.to(`user_${appt.userId}`).emit('prescriptionIssued', {
        appointmentId: id,
        prescription,
      });
    }

    res.json({
      success: true,
      message: 'Prescription added successfully',
      prescription,
    });
  }
);

// ========================================================
// 👤 5. PATIENT (Service Consumer)
// ========================================================
roleRouter.get(
  '/patient/nearby-hospitals',
  authenticateJWT,
  requireRole('PATIENT'),
  (_req: Request, res: Response): void => {
    res.json({
      success: true,
      hospitals: hospitalStore.hospitals,
    });
  }
);

roleRouter.post(
  '/patient/book-ambulance',
  authenticateJWT,
  requireRole('PATIENT'),
  (req: Request, res: Response): void => {
    const patientId = req.user?.id || 'user_edward_101';
    const { pickupLocation, hospitalId, emergencyType } = req.body;

    const newTrip = {
      id: `trip_${Date.now()}`,
      bookingId: `SOS-${Math.floor(100000 + Math.random() * 900000)}`,
      patientId,
      patientName: req.user?.email?.split('@')[0] || 'Patient',
      patientPhone: '+91 98765 43210',
      pickupLocation: pickupLocation || { latitude: 19.0600, longitude: 72.8340, address: 'Bandra West Junction' },
      hospitalId: hospitalId || 'hosp_lilavati',
      hospitalName: 'Lilavati Hospital & Research Centre',
      driverId: 'driver_108',
      driverName: 'Rajesh Kumar',
      vehicleNumber: 'MH-01-EQ-1108',
      status: 'ASSIGNED',
      createdAt: new Date().toISOString(),
    };

    hospitalStore.trips.push(newTrip);

    // Emit event ONLY to nearby driver
    const io = getIO();
    if (io) {
      io.to(`driver_driver_108`).emit('newAmbulanceTrip', newTrip);
      io.to(`patient_${patientId}`).emit('ambulanceBooked', newTrip);
    }

    res.status(201).json({
      success: true,
      message: 'Ambulance requested successfully. Nearest paramedic unit assigned.',
      trip: newTrip,
    });
  }
);

export default roleRouter;
