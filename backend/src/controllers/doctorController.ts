import { Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Doctor } from '../models/Doctor';
import { Appointment } from '../models/Appointment';
import { ENV } from '../config/env';
import { isMongoConnected } from '../config/db';
import { prescriptoStore } from '../config/prescriptoStore';

import { seedDefaultDoctorsToMongo } from '../config/prescriptoStore';

// Public API to get doctor list for frontend display (supports strict ?hospitalId= filter & x-hospital-id header)
export const doctorList = async (req: Request, res: Response): Promise<void> => {
  try {
    const hospitalId = (req.query.hospitalId as string) || (req.headers['x-hospital-id'] as string) || (req.query.hospital_id as string);
    const speciality = req.query.speciality as string;

    if (!isMongoConnected()) {
      let docs = prescriptoStore.doctors;
      if (hospitalId && hospitalId !== 'ALL' && hospitalId !== 'all' && hospitalId !== 'hosp_lilavati') {
        docs = docs.filter((d) => d.hospitalId === hospitalId);
      }
      if (speciality && speciality !== 'All' && speciality !== 'ALL') {
        docs = docs.filter((d) => d.speciality?.toLowerCase() === speciality.toLowerCase());
      }
      const doctors = docs.map(({ password, email, ...rest }) => rest);
      res.json({ success: true, count: doctors.length, hospitalId: hospitalId || 'ALL', doctors });
      return;
    }

    // Ensure all 15 doctors are synchronized and updated in MongoDB
    await seedDefaultDoctorsToMongo();

    const filter: any = {};
    if (hospitalId && hospitalId !== 'ALL' && hospitalId !== 'all' && hospitalId !== 'hosp_lilavati') {
      filter.$or = [
        { hospitalId: hospitalId },
        { hospitalId: { $exists: false } },
        { hospitalId: null },
      ];
    }
    if (speciality && speciality !== 'All' && speciality !== 'ALL') {
      filter.speciality = { $regex: `^${speciality}$`, $options: 'i' };
    }

    const doctors = await Doctor.find(filter).select(['-password', '-email']).sort({ createdAt: 1 });
    res.json({ success: true, count: doctors.length, hospitalId: hospitalId || 'ALL', doctors });
  } catch (error: any) {
    console.error('Doctor List Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API for Doctor Login
export const loginDoctor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!isMongoConnected()) {
      const doctor = prescriptoStore.doctors.find((d) => d.email === email);
      if (!doctor) {
        res.status(400).json({ success: false, message: 'Invalid credentials. Doctor not found.' });
        return;
      }
      const isMatch = await bcrypt.compare(password, doctor.password || '');
      if (!isMatch) {
        res.status(400).json({ success: false, message: 'Invalid password' });
        return;
      }
      const token = jwt.sign(
        {
          id: doctor._id,
          role: 'doctor',
          email: doctor.email,
          hospitalId: doctor.hospitalId || 'hosp_lilavati',
          hospitalName: doctor.hospitalName || 'Lilavati Hospital & Research Centre',
        },
        ENV.JWT_SECRET,
        { expiresIn: '7d' }
      );
      res.json({
        success: true,
        token,
        doctor: {
          _id: doctor._id,
          name: doctor.name,
          email: doctor.email,
          image: doctor.image,
          speciality: doctor.speciality,
          hospitalId: doctor.hospitalId || 'hosp_lilavati',
          hospitalName: doctor.hospitalName || 'Lilavati Hospital & Research Centre',
        },
      });
      return;
    }

    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      res.status(400).json({ success: false, message: 'Invalid credentials. Doctor not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, doctor.password || '');
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Invalid password' });
      return;
    }

    const token = jwt.sign(
      {
        id: doctor._id,
        role: 'doctor',
        email: doctor.email,
        hospitalId: doctor.hospitalId || 'hosp_lilavati',
        hospitalName: doctor.hospitalName || 'Lilavati Hospital & Research Centre',
      },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        image: doctor.image,
        speciality: doctor.speciality,
        hospitalId: doctor.hospitalId || 'hosp_lilavati',
        hospitalName: doctor.hospitalName || 'Lilavati Hospital & Research Centre',
      },
    });
  } catch (error: any) {
    console.error('Doctor Login Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to get doctor appointments for doctor panel
export const appointmentsDoctor = async (req: Request, res: Response): Promise<void> => {
  try {
    const docId = req.body.docId || res.locals.docId;

    if (!isMongoConnected()) {
      const appointments = prescriptoStore.appointments.filter(
        (a) => a.docId === docId || a.docData?._id === docId
      );
      res.json({ success: true, appointments });
      return;
    }

    const appointments = await Appointment.find({ docId }).sort({ createdAt: -1 });
    res.json({ success: true, appointments });
  } catch (error: any) {
    console.error('Doctor Appointments Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to mark appointment completed by doctor
export const appointmentComplete = async (req: Request, res: Response): Promise<void> => {
  try {
    const { appointmentId } = req.body;
    const docId = req.body.docId || res.locals.docId;

    if (!isMongoConnected() || !mongoose.Types.ObjectId.isValid(appointmentId)) {
      const appt = prescriptoStore.appointments.find((a) => a._id === appointmentId);
      if (!appt) {
        res.status(404).json({ success: false, message: 'Appointment not found' });
        return;
      }
      appt.isCompleted = true;
      res.json({ success: true, message: 'Appointment Completed Successfully' });
      return;
    }

    const appointmentData = await Appointment.findById(appointmentId);
    if (!appointmentData) {
      const fallbackAppt = prescriptoStore.appointments.find((a) => a._id === appointmentId);
      if (fallbackAppt) {
        fallbackAppt.isCompleted = true;
        res.json({ success: true, message: 'Appointment Completed Successfully' });
        return;
      }
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    if (appointmentData.docId.toString() !== docId.toString()) {
      res.status(403).json({ success: false, message: 'Unauthorized action on this appointment' });
      return;
    }

    appointmentData.isCompleted = true;
    await appointmentData.save();

    res.json({ success: true, message: 'Appointment Completed Successfully' });
  } catch (error: any) {
    console.error('Complete Appointment Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to cancel appointment by doctor
export const appointmentCancel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { appointmentId } = req.body;
    const docId = req.body.docId || res.locals.docId;

    if (!isMongoConnected() || !mongoose.Types.ObjectId.isValid(appointmentId)) {
      const appt = prescriptoStore.appointments.find((a) => a._id === appointmentId);
      if (!appt) {
        res.status(404).json({ success: false, message: 'Appointment not found' });
        return;
      }
      appt.cancelled = true;
      const doc = prescriptoStore.doctors.find((d) => d._id === docId);
      if (doc && doc.slots_booked && doc.slots_booked[appt.slotDate]) {
        doc.slots_booked[appt.slotDate] = doc.slots_booked[appt.slotDate].filter(
          (t: string) => t !== appt.slotTime
        );
      }
      res.json({ success: true, message: 'Appointment Cancelled' });
      return;
    }

    const appointmentData = await Appointment.findById(appointmentId);
    if (!appointmentData) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    if (appointmentData.docId.toString() !== docId.toString()) {
      res.status(403).json({ success: false, message: 'Unauthorized action on this appointment' });
      return;
    }

    appointmentData.cancelled = true;
    await appointmentData.save();

    const { slotDate, slotTime } = appointmentData;
    const doctor = mongoose.Types.ObjectId.isValid(docId)
      ? await Doctor.findById(docId)
      : await Doctor.findOne({ email: 'doc1@prescripto.com' });
    if (doctor && doctor.slots_booked && doctor.slots_booked[slotDate]) {
      doctor.slots_booked[slotDate] = doctor.slots_booked[slotDate].filter(
        (time: string) => time !== slotTime
      );
      doctor.markModified('slots_booked');
      await doctor.save();
    }

    res.json({ success: true, message: 'Appointment Cancelled' });
  } catch (error: any) {
    console.error('Doctor Cancel Appointment Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to get doctor dashboard data
export const doctorDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const docId = req.body.docId || res.locals.docId;

    if (!isMongoConnected()) {
      const docAppointments = prescriptoStore.appointments.filter(
        (a) => a.docId === docId || a.docData?._id === docId
      );
      let earnings = 0;
      const patientIds = new Set<string>();

      docAppointments.forEach((item) => {
        if (item.isCompleted || item.payment) {
          earnings += item.amount;
        }
        if (item.userId) {
          patientIds.add(item.userId.toString());
        }
      });

      res.json({
        success: true,
        dashData: {
          earnings,
          appointments: docAppointments.length,
          patients: patientIds.size,
          latestAppointments: docAppointments.slice(0, 5),
        },
      });
      return;
    }

    const appointments = await Appointment.find({ docId });
    let earnings = 0;
    const patientIds = new Set<string>();

    appointments.forEach((item) => {
      if (item.isCompleted || item.payment) {
        earnings += item.amount;
      }
      if (item.userId) {
        patientIds.add(item.userId.toString());
      }
    });

    const latestAppointments = await Appointment.find({ docId })
      .sort({ createdAt: -1 })
      .limit(5);

    const dashData = {
      earnings,
      appointments: appointments.length,
      patients: patientIds.size,
      latestAppointments,
    };

    res.json({ success: true, dashData });
  } catch (error: any) {
    console.error('Doctor Dashboard Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to get doctor profile for doctor panel
export const doctorProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const docId = req.body.docId || res.locals.docId;

    if (!isMongoConnected()) {
      const doc = prescriptoStore.doctors.find((d) => d._id === docId || d.id === docId);
      if (!doc) {
        res.status(404).json({ success: false, message: 'Doctor profile not found' });
        return;
      }
      const { password, ...profileData } = doc;
      res.json({ success: true, profileData });
      return;
    }

    const profileData = mongoose.Types.ObjectId.isValid(docId)
      ? await Doctor.findById(docId).select('-password')
      : await Doctor.findOne({ email: 'doc1@prescripto.com' }).select('-password');
    if (!profileData) {
      const fallbackDoc = prescriptoStore.doctors.find((d) => d._id === docId || d.id === docId) || prescriptoStore.doctors[0];
      if (fallbackDoc) {
        const { password, ...data } = fallbackDoc;
        return void res.json({ success: true, profileData: data });
      }
      res.status(404).json({ success: false, message: 'Doctor profile not found' });
      return;
    }
    res.json({ success: true, profileData });
  } catch (error: any) {
    console.error('Doctor Profile Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to update doctor profile data from doctor panel
export const updateDoctorProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const docId = req.body.docId || res.locals.docId;
    const { fees, address, available } = req.body;

    let parsedAddress = address;
    if (typeof address === 'string') {
      try {
        parsedAddress = JSON.parse(address);
      } catch {
        parsedAddress = { line1: address, line2: '' };
      }
    }

    if (!isMongoConnected()) {
      const doc = prescriptoStore.doctors.find((d) => d._id === docId);
      if (doc) {
        if (fees !== undefined) doc.fees = Number(fees);
        if (parsedAddress !== undefined) doc.address = parsedAddress;
        if (available !== undefined) doc.available = Boolean(available);
      }
      res.json({ success: true, message: 'Profile Updated Successfully' });
      return;
    }

    const updateFields: any = {};
    if (fees !== undefined) updateFields.fees = Number(fees);
    if (parsedAddress !== undefined) updateFields.address = parsedAddress;
    if (available !== undefined) {
      updateFields.available = Boolean(available);
      updateFields.isAvailable = Boolean(available);
    }

    if (mongoose.Types.ObjectId.isValid(docId)) {
      await Doctor.findByIdAndUpdate(docId, updateFields);
    } else {
      await Doctor.updateOne({ email: 'doc1@prescripto.com' }, { $set: updateFields });
    }

    res.json({ success: true, message: 'Profile Updated Successfully' });
  } catch (error: any) {
    console.error('Update Doctor Profile Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to toggle doctor availability
export const changeAvailablity = async (req: Request, res: Response): Promise<void> => {
  try {
    const docId = req.body.docId || res.locals.docId || (req as any).doctor?.id;
    const { isAvailable, available } = req.body;

    if (!docId) {
      res.status(400).json({ success: false, message: 'Doctor ID is required' });
      return;
    }

    if (!isMongoConnected()) {
      const doc = prescriptoStore.doctors.find((d) => d._id === docId || d.id === docId);
      if (!doc) {
        res.status(404).json({ success: false, message: 'Doctor not found' });
        return;
      }

      const newStatus = isAvailable !== undefined ? Boolean(isAvailable) : available !== undefined ? Boolean(available) : !doc.available;
      doc.available = newStatus;
      (doc as any).isAvailable = newStatus;

      res.json({
        success: true,
        message: `Doctor status updated to ${newStatus ? 'Available 🟢' : 'Not Available 🔴'}`,
        available: newStatus,
        isAvailable: newStatus,
      });
      return;
    }

    const doc = mongoose.Types.ObjectId.isValid(docId)
      ? await Doctor.findById(docId)
      : await Doctor.findOne({ email: 'doc1@prescripto.com' });
    if (!doc) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    const newStatus = isAvailable !== undefined ? Boolean(isAvailable) : available !== undefined ? Boolean(available) : !doc.available;
    doc.available = newStatus;
    doc.isAvailable = newStatus;
    await doc.save();

    res.json({
      success: true,
      message: `Doctor status updated to ${newStatus ? 'Available 🟢' : 'Not Available 🔴'}`,
      available: newStatus,
      isAvailable: newStatus,
    });
  } catch (error: any) {
    console.error('Change Doctor Availability Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleAvailability = changeAvailablity;

