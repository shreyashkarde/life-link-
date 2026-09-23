import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Doctor } from '../models/Doctor';
import { User } from '../models/User';
import { Appointment } from '../models/Appointment';
import { AmbulanceBooking } from '../models/AmbulanceBooking';
import { Rating } from '../models/Rating';
import { Notification } from '../models/Notification';
import { ENV } from '../config/env';
import { isMongoConnected } from '../config/db';
import { prescriptoStore, clearEntireStore } from '../config/prescriptoStore';

// API for admin login
export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (email === ENV.ADMIN_EMAIL && password === ENV.ADMIN_PASSWORD) {
      const token = jwt.sign(
        { id: 'admin_root', email, role: 'admin' },
        ENV.JWT_SECRET,
        { expiresIn: '7d' }
      );
      res.json({ success: true, token });
    } else {
      res.status(400).json({ success: false, message: 'Invalid Admin credentials' });
    }
  } catch (error: any) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API for adding a doctor
export const addDoctor = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      password,
      speciality,
      degree,
      experience,
      about,
      fees,
      address,
      image,
    } = req.body;

    if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees) {
      res.status(400).json({ success: false, message: 'Missing required doctor details' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, message: 'Please enter a valid email address' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    let parsedAddress = address;
    if (typeof address === 'string') {
      try {
        parsedAddress = JSON.parse(address);
      } catch {
        parsedAddress = { line1: address, line2: '' };
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const doctorData = {
      name,
      email,
      password: hashedPassword,
      image:
        image ||
        'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300',
      speciality,
      degree,
      experience,
      about,
      fees: Number(fees),
      address: parsedAddress || { line1: 'Healthcare Plaza', line2: 'Medical Wing' },
      date: Date.now(),
      available: true,
      slots_booked: {},
    };

    if (!isMongoConnected()) {
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
      res.json({ success: true, message: 'Doctor Added Successfully' });
      return;
    }

    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      res.status(400).json({ success: false, message: 'Doctor with this email already exists' });
      return;
    }

    const newDoctor = new Doctor(doctorData);
    await newDoctor.save();

    res.json({ success: true, message: 'Doctor Added Successfully' });
  } catch (error: any) {
    console.error('Add Doctor Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API for getting all doctors for admin panel
export const allDoctors = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected()) {
      const doctors = prescriptoStore.doctors.map(({ password, ...rest }) => rest);
      res.json({ success: true, doctors });
      return;
    }
    const doctors = await Doctor.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, doctors });
  } catch (error: any) {
    console.error('All Doctors Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to change doctor availability (toggle)
export const changeAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { docId } = req.body;

    if (!isMongoConnected()) {
      const doc = prescriptoStore.doctors.find((d) => d._id === docId || d.id === docId);
      if (!doc) {
        res.status(404).json({ success: false, message: 'Doctor not found' });
        return;
      }
      doc.available = !doc.available;
      res.json({
        success: true,
        message: `Availability updated to ${doc.available ? 'Available' : 'Unavailable'}`,
        available: doc.available,
      });
      return;
    }

    const docData = await Doctor.findById(docId);
    if (!docData) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    docData.available = !docData.available;
    await docData.save();

    res.json({
      success: true,
      message: `Availability updated to ${docData.available ? 'Available' : 'Unavailable'}`,
      available: docData.available,
    });
  } catch (error: any) {
    console.error('Change Availability Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to get all appointments list for admin
export const appointmentsAdmin = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected()) {
      res.json({ success: true, appointments: prescriptoStore.appointments });
      return;
    }
    const appointments = await Appointment.find({}).sort({ createdAt: -1 });
    res.json({ success: true, appointments });
  } catch (error: any) {
    console.error('Appointments Admin Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API for appointment cancellation by admin
export const appointmentCancel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { appointmentId } = req.body;

    if (!isMongoConnected()) {
      const appt = prescriptoStore.appointments.find((a) => a._id === appointmentId);
      if (!appt) {
        res.status(404).json({ success: false, message: 'Appointment not found' });
        return;
      }
      appt.cancelled = true;
      const doc = prescriptoStore.doctors.find((d) => d._id === appt.docId);
      if (doc && doc.slots_booked && doc.slots_booked[appt.slotDate]) {
        doc.slots_booked[appt.slotDate] = doc.slots_booked[appt.slotDate].filter(
          (t: string) => t !== appt.slotTime
        );
      }
      res.json({ success: true, message: 'Appointment Cancelled Successfully' });
      return;
    }

    const appointmentData = await Appointment.findById(appointmentId);
    if (!appointmentData) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    appointmentData.cancelled = true;
    await appointmentData.save();

    const { docId, slotDate, slotTime } = appointmentData;
    const docData = await Doctor.findById(docId);

    if (docData && docData.slots_booked && docData.slots_booked[slotDate]) {
      docData.slots_booked[slotDate] = docData.slots_booked[slotDate].filter(
        (time: string) => time !== slotTime
      );
      docData.markModified('slots_booked');
      await docData.save();
    }

    res.json({ success: true, message: 'Appointment Cancelled Successfully' });
  } catch (error: any) {
    console.error('Admin Cancel Appointment Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to get dashboard data for admin panel
export const adminDashboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected()) {
      const doctorsCount = prescriptoStore.doctors.length;
      const appointmentsCount = prescriptoStore.appointments.length;
      const patientsCount = prescriptoStore.users.length;
      const latestAppointments = prescriptoStore.appointments.slice(0, 5);

      res.json({
        success: true,
        dashData: {
          doctors: doctorsCount,
          appointments: appointmentsCount,
          patients: patientsCount,
          latestAppointments,
        },
      });
      return;
    }

    const doctorsCount = await Doctor.countDocuments({});
    const appointmentsCount = await Appointment.countDocuments({});
    const patientsCount = await User.countDocuments({});

    const latestAppointments = await Appointment.find({})
      .sort({ createdAt: -1 })
      .limit(5);

    const dashData = {
      doctors: doctorsCount,
      appointments: appointmentsCount,
      patients: patientsCount,
      latestAppointments,
    };

    res.json({ success: true, dashData });
  } catch (error: any) {
    console.error('Admin Dashboard Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to completely wipe all dynamic transactional & test data
export const clearAllData = async (_req: Request, res: Response): Promise<void> => {
  try {
    // 1. Wipe in-memory store
    clearEntireStore();

    // 2. If MongoDB is connected, wipe transactional collections and reset booked slots
    if (isMongoConnected()) {
      await Appointment.deleteMany({});
      await AmbulanceBooking.deleteMany({});
      await Rating.deleteMany({});
      await Notification.deleteMany({});
      await Doctor.updateMany({}, { $set: { slots_booked: {} } });
    }

    res.json({
      success: true,
      message: 'All test and dynamic data (appointments, booked slots, ambulance trips, ratings, notifications) cleared successfully. Ready for real-time data entry!',
    });
  } catch (error: any) {
    console.error('Clear All Data Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

