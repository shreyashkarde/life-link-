import { Response } from 'express';
import { Appointment } from '../models/Appointment';
import { Doctor } from '../models/Doctor';
import { AuthRequest } from '../middleware/auth';
import { isMongoConnected } from '../config/db';
import { memoryStore } from '../config/mockStore';

// Book an appointment
export const bookAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { doctorId, slotDate, slotTime, symptoms, notes } = req.body;
    const u = req.user;

    if (!isMongoConnected()) {
      const doc = memoryStore.doctors.find((d) => d._id === doctorId || d.id === doctorId) || memoryStore.doctors[0];
      const newAppt = {
        _id: `appt_${Date.now()}`,
        id: `appt_${Date.now()}`,
        patientId: u,
        doctorId: doc,
        hospitalId: doc.hospitalId,
        slotDate,
        slotTime,
        symptoms: symptoms || '',
        notes: notes || '',
        consultationFee: doc.consultationFee || 500,
        paymentStatus: 'PAID',
        status: 'BOOKED',
        createdAt: new Date().toISOString(),
      };

      memoryStore.appointments.unshift(newAppt);
      res.status(201).json({ success: true, message: 'Appointment booked successfully', appointment: newAppt });
      return;
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    const appointment = await Appointment.create({
      patientId: req.user._id,
      doctorId: doctor._id,
      hospitalId: doctor.hospitalId,
      slotDate,
      slotTime,
      symptoms: symptoms || '',
      notes: notes || '',
      consultationFee: doctor.consultationFee || 500,
      paymentStatus: 'PAID',
      status: 'BOOKED',
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'name email phone avatar')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate('hospitalId', 'name address contactNumber');

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: populatedAppointment,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to book appointment' });
  }
};

// Get user's appointments (Patient)
export const getPatientAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const uId = req.user?._id || req.user?.id;

    if (!isMongoConnected()) {
      const list = memoryStore.appointments.filter(
        (a) => a.patientId?._id === uId || a.patientId?.id === uId
      );
      res.json({ success: true, count: list.length, appointments: list.length > 0 ? list : memoryStore.appointments });
      return;
    }

    const appointments = await Appointment.find({ patientId: req.user._id })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate('hospitalId', 'name address contactNumber')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: appointments.length, appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch appointments' });
  }
};

// Get doctor's appointments (Doctor)
export const getDoctorAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected()) {
      res.json({ success: true, count: memoryStore.appointments.length, appointments: memoryStore.appointments });
      return;
    }

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor profile not found' });
      return;
    }

    const appointments = await Appointment.find({ doctorId: doctor._id })
      .populate('patientId', 'name email phone avatar')
      .populate('hospitalId', 'name address')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: appointments.length, appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch appointments' });
  }
};

// Update Appointment Status
export const updateAppointmentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, prescription, notes } = req.body;

    if (!isMongoConnected()) {
      const appt = memoryStore.appointments.find((a) => a._id === id || a.id === id);
      if (appt) {
        if (status) appt.status = status;
        if (prescription) appt.prescription = prescription;
        if (notes) appt.notes = notes;
      }
      res.json({ success: true, message: 'Appointment updated successfully', appointment: appt });
      return;
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    if (status) appointment.status = status;
    if (prescription !== undefined) appointment.prescription = prescription;
    if (notes !== undefined) appointment.notes = notes;

    await appointment.save();
    const updated = await Appointment.findById(id)
      .populate('patientId', 'name email phone avatar')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      });

    res.json({ success: true, message: 'Appointment updated successfully', appointment: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update appointment' });
  }
};
