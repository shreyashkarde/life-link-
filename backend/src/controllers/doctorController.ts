import { Request, Response } from 'express';
import { Doctor } from '../models/Doctor';
import { AuthRequest } from '../middleware/auth';
import { Appointment } from '../models/Appointment';
import { isMongoConnected } from '../config/db';
import { memoryStore } from '../config/mockStore';

// Get all doctors with filters
export const getAllDoctors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { specialization, search, minRating } = req.query;

    if (!isMongoConnected()) {
      let filtered = [...memoryStore.doctors];

      if (specialization && specialization !== 'All') {
        filtered = filtered.filter(
          (d) => d.specialization.toLowerCase() === (specialization as string).toLowerCase()
        );
      }

      if (minRating) {
        filtered = filtered.filter((d) => d.averageRating >= Number(minRating));
      }

      if (search) {
        const q = (search as string).toLowerCase();
        filtered = filtered.filter(
          (d) =>
            d.userId?.name?.toLowerCase().includes(q) ||
            d.specialization?.toLowerCase().includes(q)
        );
      }

      res.json({
        success: true,
        count: filtered.length,
        total: filtered.length,
        currentPage: 1,
        totalPages: 1,
        doctors: filtered,
      });
      return;
    }

    const filter: any = {};
    if (specialization && specialization !== 'All') {
      filter.specialization = new RegExp(`^${specialization}$`, 'i');
    }

    if (minRating) {
      filter.averageRating = { $gte: Number(minRating) };
    }

    let doctors = await Doctor.find(filter)
      .populate('userId', 'name email phone avatar')
      .populate('hospitalId', 'name address city emergencyNumber')
      .sort({ averageRating: -1 })
      .exec();

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      doctors = doctors.filter((doc: any) =>
        doc.userId && searchRegex.test(doc.userId.name)
      );
    }

    res.json({
      success: true,
      count: doctors.length,
      total: doctors.length,
      currentPage: 1,
      totalPages: 1,
      doctors,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch doctors' });
  }
};

// Get single doctor details
export const getDoctorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isMongoConnected()) {
      const doc = memoryStore.doctors[0];
      res.json({ success: true, doctor: doc });
      return;
    }

    const doctor = await Doctor.findById(id)
      .populate('userId', 'name email phone avatar')
      .populate('hospitalId', 'name address city contactNumber emergencyNumber');

    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    res.json({ success: true, doctor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch doctor' });
  }
};

// Update Doctor profile
export const updateDoctorProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'DOCTOR') {
      res.status(403).json({ success: false, message: 'Access denied: Doctor role required' });
      return;
    }

    if (!isMongoConnected()) {
      res.json({ success: true, message: 'Doctor profile updated' });
      return;
    }

    const { specialization, qualifications, experienceYears, consultationFee, bio, isAvailableToday } = req.body;
    const doctor = await Doctor.findOneAndUpdate(
      { userId: req.user._id },
      {
        ...(specialization && { specialization }),
        ...(qualifications && { qualifications }),
        ...(experienceYears !== undefined && { experienceYears }),
        ...(consultationFee !== undefined && { consultationFee }),
        ...(bio !== undefined && { bio }),
        ...(isAvailableToday !== undefined && { isAvailableToday }),
      },
      { new: true }
    ).populate('userId', 'name email phone avatar');

    res.json({ success: true, message: 'Doctor profile updated', doctor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update profile' });
  }
};

// Update Doctor slots
export const updateDoctorSlots = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slots } = req.body;

    if (!isMongoConnected()) {
      const uId = req.user?._id || req.user?.id;
      const doc = memoryStore.doctors.find((d) => d.userId?._id === uId || d.userId?.id === uId) || memoryStore.doctors[0];
      if (doc) {
        doc.availableSlots = slots;
      }
      res.json({ success: true, message: 'Slots updated successfully', slots });
      return;
    }

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor profile not found' });
      return;
    }

    doctor.availableSlots = slots;
    await doctor.save();

    res.json({ success: true, message: 'Slots updated successfully', slots: doctor.availableSlots });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update slots' });
  }
};

// Doctor Dashboard Stats
export const getDoctorDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected()) {
      const uId = req.user?._id || req.user?.id;
      const doc = memoryStore.doctors.find((d) => d.userId?._id === uId || d.userId?.id === uId) || memoryStore.doctors[0];
      res.json({
        success: true,
        stats: {
          totalAppointments: memoryStore.appointments.length,
          pendingAppointments: memoryStore.appointments.filter((a) => a.status === 'BOOKED').length,
          completedAppointments: memoryStore.appointments.filter((a) => a.status === 'COMPLETED').length,
          averageRating: doc?.averageRating || 4.9,
          reviewCount: doc?.reviewCount || 48,
          consultationFee: doc?.consultationFee || 800,
          availableSlotsCount: doc?.availableSlots?.filter((s: any) => !s.isBooked).length || 4,
        },
      });
      return;
    }

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    const totalAppointments = await Appointment.countDocuments({ doctorId: doctor._id });
    const pendingAppointments = await Appointment.countDocuments({ doctorId: doctor._id, status: 'BOOKED' });
    const completedAppointments = await Appointment.countDocuments({ doctorId: doctor._id, status: 'COMPLETED' });

    res.json({
      success: true,
      stats: {
        totalAppointments,
        pendingAppointments,
        completedAppointments,
        averageRating: doctor.averageRating,
        reviewCount: doctor.reviewCount,
        consultationFee: doctor.consultationFee,
        availableSlotsCount: doctor.availableSlots.filter((s) => !s.isBooked).length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch doctor stats' });
  }
};
