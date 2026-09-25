import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Appointment } from '../models/Appointment';
import { Doctor } from '../models/Doctor';
import { User } from '../models/User';
import { Hospital } from '../models/Hospital';
import { prescriptoStore } from '../config/prescriptoStore';
import { isMongoConnected } from '../config/db';
import { ENV } from '../config/env';
import { emitAppointmentBooked } from '../socket/socketHandler';

const appointmentRouter = express.Router();

/**
 * Helper to resolve user/patient ID from request headers or token
 */
const resolveUserId = (req: Request): string => {
  try {
    const rawToken =
      req.headers.token ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null) ||
      req.cookies?.token;

    if (rawToken && typeof rawToken === 'string') {
      const decoded: any = jwt.verify(rawToken, ENV.JWT_SECRET);
      if (decoded && (decoded.id || decoded.userId || decoded._id)) {
        return decoded.id || decoded.userId || decoded._id;
      }
    }
  } catch {
    // Non-blocking fallback to request body patientId
  }
  return req.body.patientId || req.body.userId || 'user_edward_101';
};

/**
 * 📅 POST /api/appointments
 * Creates an appointment with doctor, hospital, time, and status = BOOKED.
 * Strictly prevents double-booking and emits real-time socket alerts.
 */
appointmentRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const patientId = resolveUserId(req);
    const doctorId = req.body.doctorId || req.body.docId;
    const hospitalId = req.body.hospitalId || 'hosp_lilavati';
    const rawTime = req.body.time || req.body.slotTime;
    let slotDate = req.body.slotDate;
    let slotTime = req.body.slotTime || rawTime;

    if (!doctorId) {
      res.status(400).json({ success: false, message: 'Doctor ID is required for booking' });
      return;
    }

    // Default to today if slotDate not passed
    if (!slotDate) {
      const now = new Date();
      slotDate = `${now.getDate()}_${now.getMonth() + 1}_${now.getFullYear()}`;
    }

    if (!slotTime) {
      slotTime = '11:00 am';
    }

    // In-memory prescriptoStore handling
    if (!isMongoConnected()) {
      const normalizedDocId = doctorId.toString().trim();
      const doc = prescriptoStore.doctors.find(
        (d) =>
          d._id === normalizedDocId ||
          d.id === normalizedDocId ||
          d._id === `doc_${normalizedDocId.replace(/^doc_?/, '')}` ||
          d.name?.toLowerCase().includes(normalizedDocId.toLowerCase())
      ) || prescriptoStore.doctors[0];

      if (!doc) {
        res.status(404).json({ success: false, message: 'Selected doctor not found' });
        return;
      }

      if (doc.available === false || (doc as any).isAvailable === false) {
        res.status(400).json({ success: false, message: 'Doctor is currently busy or unavailable' });
        return;
      }

      // Check double-booking
      doc.slots_booked = doc.slots_booked || {};
      if (doc.slots_booked[slotDate]) {
        if (doc.slots_booked[slotDate].includes(slotTime)) {
          res.status(400).json({
            success: false,
            message: `Time slot ${slotTime} on ${slotDate} is already booked. Please pick another slot.`,
          });
          return;
        }
        doc.slots_booked[slotDate].push(slotTime);
      } else {
        doc.slots_booked[slotDate] = [slotTime];
      }

      const hosp =
        prescriptoStore.hospitals.find((h) => h.id === hospitalId || h._id === hospitalId) ||
        prescriptoStore.hospitals[0];

      const user = prescriptoStore.users.find((u) => u._id === patientId || u.id === patientId) || {
        _id: patientId,
        name: req.body.patientName || 'Edward Vincent',
        email: 'patient@prescripto.com',
      };

      const newAppt: any = {
        _id: `appt_${Date.now()}`,
        id: `appt_${Date.now()}`,
        patientId,
        userId: patientId,
        doctorId: doc._id || doc.id,
        docId: doc._id || doc.id,
        hospitalId: hosp.id || hosp._id || hospitalId,
        hospitalName: hosp.name || 'Lilavati Hospital & Research Centre',
        time: slotTime,
        slotDate,
        slotTime,
        status: 'BOOKED',
        amount: doc.fees || 50,
        userData: user,
        docData: {
          _id: doc._id,
          name: doc.name,
          speciality: doc.speciality,
          degree: doc.degree,
          fees: doc.fees,
          image: doc.image,
          hospitalId: hosp.id || hospitalId,
          hospitalName: hosp.name,
        },
        cancelled: false,
        payment: false,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      };

      prescriptoStore.appointments.unshift(newAppt);

      // Emit real-time socket notification
      try {
        emitAppointmentBooked(newAppt);
      } catch (err) {
        // Non-blocking
      }

      res.status(201).json({
        success: true,
        message: `Appointment successfully booked with ${doc.name} at ${hosp.name}!`,
        appointment: newAppt,
      });
      return;
    }

    // MongoDB Connected
    const isDocObjectId = mongoose.Types.ObjectId.isValid(doctorId);
    const docData: any = isDocObjectId
      ? await Doctor.findById(doctorId).select('-password')
      : await Doctor.findOne({
          $or: [{ _id: doctorId }, { email: doctorId }, { name: { $regex: doctorId, $options: 'i' } }],
        }).select('-password');

    if (!docData) {
      res.status(404).json({ success: false, message: 'Doctor not found in registry' });
      return;
    }

    if (docData.available === false || (docData as any).isAvailable === false) {
      res.status(400).json({ success: false, message: 'Doctor is currently busy or unavailable' });
      return;
    }

    let slots_booked = docData.slots_booked || {};
    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        res.status(400).json({
          success: false,
          message: `Slot ${slotTime} on ${slotDate} is already reserved. Please select a different time slot.`,
        });
        return;
      }
      slots_booked[slotDate].push(slotTime);
    } else {
      slots_booked[slotDate] = [slotTime];
    }

    // Resolve patient details
    let userData: any = { _id: patientId, name: req.body.patientName || 'Edward Vincent', email: 'patient@prescripto.com' };
    if (mongoose.Types.ObjectId.isValid(patientId)) {
      const dbUser = await User.findById(patientId).select('-password');
      if (dbUser) userData = dbUser;
    }

    // Resolve hospital name
    let hospitalName = 'Lilavati Hospital & Research Centre';
    if (mongoose.Types.ObjectId.isValid(hospitalId)) {
      const dbHosp = await Hospital.findById(hospitalId);
      if (dbHosp) hospitalName = dbHosp.name;
    } else {
      const matchedHosp = prescriptoStore.hospitals.find((h) => h.id === hospitalId || h._id === hospitalId);
      if (matchedHosp) hospitalName = matchedHosp.name;
    }

    const appointmentPayload = {
      userId: patientId,
      patientId,
      docId: docData._id,
      doctorId: docData._id,
      hospitalId,
      hospitalName,
      slotDate,
      slotTime,
      amount: docData.fees || 50,
      userData,
      docData: {
        _id: docData._id,
        name: docData.name,
        speciality: docData.speciality,
        degree: docData.degree,
        fees: docData.fees,
        image: docData.image,
        hospitalId,
        hospitalName,
      },
      status: 'BOOKED' as const,
      date: Date.now(),
      cancelled: false,
      payment: false,
      isCompleted: false,
    };

    const newAppointment = await Appointment.create(appointmentPayload);
    await Doctor.findByIdAndUpdate(docData._id, { slots_booked });

    // 🔔 Real-time Socket alert
    try {
      emitAppointmentBooked(newAppointment);
    } catch {
      // Non-blocking
    }

    res.status(201).json({
      success: true,
      message: `Appointment successfully booked with ${docData.name} at ${hospitalName}!`,
      appointment: newAppointment,
    });
  } catch (error: any) {
    console.error('Book Appointment Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 📅 GET /api/appointments
 * Retrieves appointments for the current patient or hospital
 */
appointmentRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const patientId = resolveUserId(req);
    const hospitalId = req.query.hospitalId as string;

    if (!isMongoConnected()) {
      let appointments = prescriptoStore.appointments;
      if (patientId && patientId !== 'ALL') {
        appointments = appointments.filter(
          (a) => a.patientId === patientId || a.userId === patientId
        );
      }
      if (hospitalId && hospitalId !== 'ALL') {
        appointments = appointments.filter((a) => a.hospitalId === hospitalId);
      }
      res.json({ success: true, count: appointments.length, appointments });
      return;
    }

    const filter: any = {};
    if (patientId && patientId !== 'ALL') {
      filter.$or = [{ userId: patientId }, { patientId }];
    }
    if (hospitalId && hospitalId !== 'ALL') {
      filter.hospitalId = hospitalId;
    }

    const appointments = await Appointment.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: appointments.length, appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default appointmentRouter;
