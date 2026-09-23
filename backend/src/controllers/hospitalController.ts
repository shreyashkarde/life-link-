import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Hospital } from '../models/Hospital';
import { Doctor } from '../models/Doctor';
import { Ambulance } from '../models/Ambulance';
import { Appointment } from '../models/Appointment';
import { AmbulanceBooking } from '../models/AmbulanceBooking';
import { User } from '../models/User';
import { prescriptoStore } from '../config/prescriptoStore';
import { isMongoConnected } from '../config/db';
import { AuthRequest } from '../middleware/auth';

// ==========================================
// 👑 1. SUPER ADMIN: Hospital Hierarchy CRUD
// ==========================================

// POST /api/hospitals (Create Hospital)
export const createHospital = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, address, city = 'Mumbai', traumaLevel, totalBeds, icuBedsAvailable, adminEmail, contactPhone } = req.body;

    if (!name || !address || !adminEmail) {
      res.status(400).json({ success: false, message: 'Hospital name, address, and admin email are required' });
      return;
    }

    const hospitalData = {
      name,
      address,
      city,
      traumaLevel: traumaLevel || 'Level 1 Apex Trauma Center',
      totalBeds: Number(totalBeds) || 200,
      icuBedsAvailable: Number(icuBedsAvailable) || 20,
      adminEmail: adminEmail.toLowerCase().trim(),
      contactPhone: contactPhone || '+91 22 2675 1000',
      isActive: true,
      doctorsCount: 0,
      driversCount: 0,
    };

    if (isMongoConnected()) {
      const existing = await Hospital.findOne({ adminEmail: hospitalData.adminEmail });
      if (existing) {
        res.status(400).json({ success: false, message: 'Hospital with this admin email already exists' });
        return;
      }
      const newHospital = await Hospital.create(hospitalData);
      res.status(201).json({ success: true, message: 'Hospital created successfully', hospital: newHospital });
      return;
    }

    // In-memory fallback
    const id = `hosp_${Date.now()}`;
    const newHospital = {
      _id: id,
      id,
      ...hospitalData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    prescriptoStore.hospitals.push(newHospital);

    res.status(201).json({ success: true, message: 'Hospital created successfully', hospital: newHospital });
  } catch (error: any) {
    console.error('Create Hospital Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/hospitals (Get All Hospitals)
export const getAllHospitals = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (isMongoConnected()) {
      const hospitals = await Hospital.find({ isActive: true }).sort({ createdAt: -1 });
      res.json({ success: true, hospitals, count: hospitals.length });
      return;
    }

    res.json({
      success: true,
      hospitals: prescriptoStore.hospitals,
      count: prescriptoStore.hospitals.length,
    });
  } catch (error: any) {
    console.error('Get Hospitals Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/hospitals/:id (Get Hospital By ID)
export const getHospitalById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (isMongoConnected()) {
      const hospital = await Hospital.findById(id);
      if (!hospital) {
        res.status(404).json({ success: false, message: 'Hospital not found' });
        return;
      }
      res.json({ success: true, hospital });
      return;
    }

    const hospital = prescriptoStore.hospitals.find((h) => h._id === id || h.id === id);
    if (!hospital) {
      res.status(404).json({ success: false, message: 'Hospital not found' });
      return;
    }

    res.json({ success: true, hospital });
  } catch (error: any) {
    console.error('Get Hospital Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/hospitals/:id (Update Hospital)
export const updateHospital = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (isMongoConnected()) {
      const hospital = await Hospital.findByIdAndUpdate(id, updates, { new: true });
      if (!hospital) {
        res.status(404).json({ success: false, message: 'Hospital not found' });
        return;
      }
      res.json({ success: true, message: 'Hospital updated successfully', hospital });
      return;
    }

    const hospital = prescriptoStore.hospitals.find((h) => h._id === id || h.id === id);
    if (!hospital) {
      res.status(404).json({ success: false, message: 'Hospital not found' });
      return;
    }

    Object.assign(hospital, updates);
    res.json({ success: true, message: 'Hospital updated successfully', hospital });
  } catch (error: any) {
    console.error('Update Hospital Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/hospitals/:id (Soft Delete Hospital)
export const deleteHospital = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (isMongoConnected()) {
      const hospital = await Hospital.findByIdAndUpdate(id, { isActive: false }, { new: true });
      if (!hospital) {
        res.status(404).json({ success: false, message: 'Hospital not found' });
        return;
      }
      res.json({ success: true, message: 'Hospital deactivated successfully' });
      return;
    }

    const index = prescriptoStore.hospitals.findIndex((h) => h._id === id || h.id === id);
    if (index === -1) {
      res.status(404).json({ success: false, message: 'Hospital not found' });
      return;
    }

    prescriptoStore.hospitals.splice(index, 1);
    res.json({ success: true, message: 'Hospital removed successfully' });
  } catch (error: any) {
    console.error('Delete Hospital Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/superadmin/overview (System-Wide Hierarchy Stats)
export const getSuperAdminOverview = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (isMongoConnected()) {
      const [hospitalsCount, doctorsCount, driversCount, appointmentsCount, bookingsCount, patientsCount] =
        await Promise.all([
          Hospital.countDocuments({ isActive: true }),
          Doctor.countDocuments({}),
          Ambulance.countDocuments({}),
          Appointment.countDocuments({}),
          AmbulanceBooking.countDocuments({}),
          User.countDocuments({ role: 'PATIENT' }),
        ]);

      res.json({
        success: true,
        stats: {
          totalHospitals: hospitalsCount,
          totalDoctors: doctorsCount,
          totalDrivers: driversCount,
          totalAppointments: appointmentsCount,
          totalAmbulanceBookings: bookingsCount,
          totalPatients: patientsCount,
        },
      });
      return;
    }

    res.json({
      success: true,
      stats: {
        totalHospitals: prescriptoStore.hospitals.length,
        totalDoctors: prescriptoStore.doctors.length,
        totalDrivers: prescriptoStore.ambulances.length,
        totalAppointments: prescriptoStore.appointments.length,
        totalAmbulanceBookings: prescriptoStore.ambulanceBookings.length,
        totalPatients: prescriptoStore.users.length,
      },
    });
  } catch (error: any) {
    console.error('SuperAdmin Overview Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 🏥 2. HOSPITAL ADMIN: Hospital Staff & Flow
// ==========================================

// Helper to determine hospitalId for hospital admin request
const resolveHospitalId = (req: AuthRequest): string => {
  return (req.user as any)?.hospitalId || (req.query?.hospitalId as string) || 'hosp_lilavati';
};

// GET /api/hospital/profile (Get Hospital Admin's Hospital)
export const getHospitalProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hospitalId = resolveHospitalId(req);

    if (isMongoConnected()) {
      const hospital = (await Hospital.findById(hospitalId)) || (await Hospital.findOne({ isActive: true }));
      res.json({ success: true, hospital });
      return;
    }

    const hospital =
      prescriptoStore.hospitals.find((h) => h._id === hospitalId || h.id === hospitalId) ||
      prescriptoStore.hospitals[0];

    res.json({ success: true, hospital });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/hospital/doctors (Get doctors belonging to this hospital)
export const getHospitalDoctors = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hospitalId = resolveHospitalId(req);

    if (isMongoConnected()) {
      const doctors = await Doctor.find({
        $or: [{ hospitalId }, { hospitalId: { $exists: false } }],
      }).select('-password');
      res.json({ success: true, doctors, count: doctors.length });
      return;
    }

    const doctors = prescriptoStore.doctors.filter(
      (d) => !d.hospitalId || d.hospitalId === hospitalId || hospitalId === 'hosp_lilavati'
    );
    res.json({ success: true, doctors, count: doctors.length });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/hospital/doctors (Add doctor under this hospital)
export const addHospitalDoctor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hospitalId = resolveHospitalId(req);
    const { name, email, password, speciality, degree, experience, about, fees, address, image } = req.body;

    if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees) {
      res.status(400).json({ success: false, message: 'All doctor fields are required' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Resolve hospital name
    let hospitalName = 'Lilavati Hospital & Research Centre';
    const hosp = prescriptoStore.hospitals.find((h) => h._id === hospitalId || h.id === hospitalId);
    if (hosp) hospitalName = hosp.name;

    const doctorData = {
      name,
      email,
      password: hashedPassword,
      image: image || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300',
      speciality,
      degree,
      experience,
      about,
      fees: Number(fees),
      address: typeof address === 'string' ? { line1: address, line2: '' } : address || { line1: 'Healthcare Plaza' },
      available: true,
      hospitalId,
      hospitalName,
      date: Date.now(),
      slots_booked: {},
    };

    if (isMongoConnected()) {
      const existingDoctor = await Doctor.findOne({ email });
      if (existingDoctor) {
        res.status(400).json({ success: false, message: 'Doctor with this email already exists' });
        return;
      }
      const newDoc = await Doctor.create(doctorData);
      res.status(201).json({ success: true, message: 'Doctor added to hospital', doctor: newDoc });
      return;
    }

    const existing = prescriptoStore.doctors.find((d) => d.email === email);
    if (existing) {
      res.status(400).json({ success: false, message: 'Doctor with this email already exists' });
      return;
    }

    const newDoc = {
      _id: `doc_${Date.now()}`,
      ...doctorData,
    };
    prescriptoStore.doctors.unshift(newDoc);

    res.status(201).json({ success: true, message: 'Doctor added to hospital', doctor: newDoc });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/hospital/drivers (Get drivers/ambulances belonging to this hospital)
export const getHospitalDrivers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hospitalId = resolveHospitalId(req);

    if (isMongoConnected()) {
      const drivers = await Ambulance.find({
        $or: [{ hospitalId }, { assignedHospital: { $regex: 'Lilavati', $options: 'i' } }],
      });
      res.json({ success: true, drivers, count: drivers.length });
      return;
    }

    const drivers = prescriptoStore.ambulances.filter(
      (a) => !a.hospitalId || a.hospitalId === hospitalId || hospitalId === 'hosp_lilavati'
    );
    res.json({ success: true, drivers, count: drivers.length });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/hospital/drivers (Add/recruit driver for this hospital)
export const addHospitalDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hospitalId = resolveHospitalId(req);
    const { driverName, driverPhone, driverEmail, vehicleNumber, ambulanceType, equipmentList } = req.body;

    if (!driverName || !driverPhone || !vehicleNumber) {
      res.status(400).json({ success: false, message: 'Driver name, phone, and vehicle number are required' });
      return;
    }

    let hospitalName = 'Lilavati Hospital & Research Centre';
    const hosp = prescriptoStore.hospitals.find((h) => h._id === hospitalId || h.id === hospitalId);
    if (hosp) hospitalName = hosp.name;

    const ambulanceData = {
      driverName,
      driverPhone,
      driverEmail: driverEmail || `driver_${Date.now()}@prescripto.com`,
      driverId: `driver_${Date.now()}`,
      vehicleNumber,
      ambulanceType: ambulanceType || 'ADVANCED',
      currentLocation: {
        lat: 19.0760,
        lng: 72.8777,
        address: 'Bandra West Junction, Mumbai',
        heading: 0,
        lastUpdated: new Date(),
      },
      isAvailable: true,
      currentStatus: 'IDLE' as const,
      assignedHospital: hospitalName,
      hospitalId,
      hospitalName,
      rating: 5.0,
      reviewCount: 0,
      equipmentList: equipmentList || ['Oxygen Tank', 'Defibrillator (AED)', 'ECG Monitor', 'Emergency Stretcher'],
    };

    if (isMongoConnected()) {
      const newAmb = await Ambulance.create(ambulanceData);
      res.status(201).json({ success: true, message: 'Driver recruited for hospital fleet', driver: newAmb });
      return;
    }

    const newAmb = {
      _id: `amb_${Date.now()}`,
      ...ambulanceData,
    };
    prescriptoStore.ambulances.push(newAmb);

    res.status(201).json({ success: true, message: 'Driver recruited for hospital fleet', driver: newAmb });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/hospital/appointments (Get appointments for this hospital)
export const getHospitalAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hospitalId = resolveHospitalId(req);

    if (isMongoConnected()) {
      const appointments = await Appointment.find({
        $or: [{ hospitalId }, { 'docData.hospitalId': hospitalId }],
      }).sort({ createdAt: -1 });
      res.json({ success: true, appointments, count: appointments.length });
      return;
    }

    const appointments = prescriptoStore.appointments.filter(
      (a) => !a.hospitalId || a.hospitalId === hospitalId || a.docData?.hospitalId === hospitalId
    );
    res.json({ success: true, appointments, count: appointments.length });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/hospital/ambulance-bookings (Get ambulance bookings for this hospital)
export const getHospitalAmbulanceBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hospitalId = resolveHospitalId(req);

    if (isMongoConnected()) {
      const bookings = await AmbulanceBooking.find({
        $or: [{ hospitalId }, { 'destinationHospital.name': { $regex: 'Lilavati', $options: 'i' } }],
      }).sort({ createdAt: -1 });
      res.json({ success: true, bookings, count: bookings.length });
      return;
    }

    const bookings = prescriptoStore.ambulanceBookings.filter(
      (b) => !b.hospitalId || b.hospitalId === hospitalId
    );
    res.json({ success: true, bookings, count: bookings.length });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/hospital/dashboard (Hospital Analytics & Metrics)
export const getHospitalDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hospitalId = resolveHospitalId(req);

    let hospital: any;
    let doctorsCount = 0;
    let driversCount = 0;
    let appointmentsCount = 0;
    let activeEmergencyCount = 0;

    if (isMongoConnected()) {
      hospital = await Hospital.findById(hospitalId);
      doctorsCount = await Doctor.countDocuments({
        $or: [{ hospitalId }, { hospitalId: { $exists: false } }],
      });
      driversCount = await Ambulance.countDocuments({
        $or: [{ hospitalId }, { assignedHospital: { $regex: 'Lilavati', $options: 'i' } }],
      });
      appointmentsCount = await Appointment.countDocuments({
        $or: [{ hospitalId }, { 'docData.hospitalId': hospitalId }],
      });
      activeEmergencyCount = await AmbulanceBooking.countDocuments({
        status: { $in: ['ACCEPTED', 'EN_ROUTE_PICKUP', 'PATIENT_ONBOARD', 'PENDING'] },
      });
    } else {
      hospital =
        prescriptoStore.hospitals.find((h) => h._id === hospitalId || h.id === hospitalId) ||
        prescriptoStore.hospitals[0];
      doctorsCount = prescriptoStore.doctors.length;
      driversCount = prescriptoStore.ambulances.length;
      appointmentsCount = prescriptoStore.appointments.length;
      activeEmergencyCount = prescriptoStore.ambulanceBookings.filter(
        (b) => b.status === 'ACCEPTED' || b.status === 'PENDING'
      ).length;
    }

    res.json({
      success: true,
      dashboard: {
        hospitalName: hospital?.name || 'Lilavati Hospital & Research Centre',
        traumaLevel: hospital?.traumaLevel || 'Level 1 Apex Trauma Center',
        icuBedsAvailable: hospital?.icuBedsAvailable ?? 14,
        totalBeds: hospital?.totalBeds ?? 323,
        doctorsCount,
        driversCount,
        appointmentsCount,
        inboundAmbulancesCount: activeEmergencyCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
