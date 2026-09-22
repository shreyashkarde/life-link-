import { Response } from 'express';
import { User } from '../models/User';
import { Doctor } from '../models/Doctor';
import { Ambulance } from '../models/Ambulance';
import { Hospital } from '../models/Hospital';
import { Appointment } from '../models/Appointment';
import { AmbulanceBooking } from '../models/AmbulanceBooking';
import { AuthRequest } from '../middleware/auth';
import { isMongoConnected } from '../config/db';
import { memoryStore } from '../config/mockStore';

// Hospital Admin Dashboard Overview
export const getHospitalAdminStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected()) {
      const hospital = memoryStore.hospitals[0];
      res.json({
        success: true,
        hospital,
        stats: {
          totalDoctors: memoryStore.doctors.length,
          totalAmbulances: memoryStore.ambulances.length,
          onlineAmbulances: memoryStore.ambulances.filter((a) => a.isOnline).length,
          availableBeds: hospital.availableBeds,
          totalBeds: hospital.totalBeds,
          icuBedsAvailable: hospital.icuBedsAvailable,
          recentAppointmentsCount: memoryStore.appointments.length,
          activeEmergenciesCount: memoryStore.bookings.filter((b) => b.isSOS).length,
        },
        doctors: memoryStore.doctors,
        ambulances: memoryStore.ambulances,
        recentAppointments: memoryStore.appointments,
        activeEmergencies: memoryStore.bookings,
      });
      return;
    }

    const hospitalId = req.user?.hospitalId;
    let hospital = null;
    if (hospitalId) {
      hospital = await Hospital.findById(hospitalId);
    } else {
      hospital = await Hospital.findOne();
    }

    const doctors = await Doctor.find(hospital ? { hospitalId: hospital._id } : {})
      .populate('userId', 'name email phone avatar isActive');

    const ambulances = await Ambulance.find(hospital ? { hospitalId: hospital._id } : {})
      .populate('driverId', 'name email phone avatar');

    const recentAppointments = await Appointment.find(hospital ? { hospitalId: hospital._id } : {})
      .populate('patientId', 'name email phone')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' },
      })
      .sort({ createdAt: -1 })
      .limit(10);

    const activeEmergencies = await AmbulanceBooking.find({
      status: { $in: ['PENDING', 'ACCEPTED', 'ONGOING', 'ARRIVED_AT_PATIENT'] },
    })
      .populate('patientId', 'name email phone')
      .populate('driverId', 'name phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      hospital,
      stats: {
        totalDoctors: doctors.length,
        totalAmbulances: ambulances.length,
        onlineAmbulances: ambulances.filter((a) => a.isOnline).length,
        availableBeds: hospital?.availableBeds || 18,
        totalBeds: hospital?.totalBeds || 120,
        icuBedsAvailable: hospital?.icuBedsAvailable || 4,
        recentAppointmentsCount: recentAppointments.length,
        activeEmergenciesCount: activeEmergencies.length,
      },
      doctors,
      ambulances,
      recentAppointments,
      activeEmergencies,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch hospital stats' });
  }
};

// Super Admin Global Overview
export const getSuperAdminStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected()) {
      res.json({
        success: true,
        stats: {
          totalUsers: memoryStore.users.length,
          patientsCount: memoryStore.users.filter((u) => u.role === 'PATIENT').length,
          doctorsCount: memoryStore.users.filter((u) => u.role === 'DOCTOR').length,
          driversCount: memoryStore.users.filter((u) => u.role === 'DRIVER').length,
          hospitalsCount: memoryStore.hospitals.length,
          totalAppointments: memoryStore.appointments.length,
          totalRides: memoryStore.bookings.length,
          activeEmergencies: memoryStore.bookings.filter((b) => b.isSOS).length,
          avgResponseMinutes: 4.8,
          patientSatisfaction: 98.4,
        },
        recentUsers: memoryStore.users,
        hospitals: memoryStore.hospitals,
      });
      return;
    }

    const totalUsers = await User.countDocuments();
    const patientsCount = await User.countDocuments({ role: 'PATIENT' });
    const doctorsCount = await User.countDocuments({ role: 'DOCTOR' });
    const driversCount = await User.countDocuments({ role: 'DRIVER' });
    const hospitalsCount = await Hospital.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const totalRides = await AmbulanceBooking.countDocuments();
    const activeEmergencies = await AmbulanceBooking.countDocuments({
      status: { $in: ['PENDING', 'ACCEPTED', 'ONGOING'] },
    });

    const recentUsers = await User.find().select('-password').sort({ createdAt: -1 }).limit(10);
    const hospitals = await Hospital.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      stats: {
        totalUsers,
        patientsCount,
        doctorsCount,
        driversCount,
        hospitalsCount,
        totalAppointments,
        totalRides,
        activeEmergencies,
        avgResponseMinutes: 4.8,
        patientSatisfaction: 98.4,
      },
      recentUsers,
      hospitals,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch super admin stats' });
  }
};

// Super Admin: Get all users
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, search } = req.query;

    if (!isMongoConnected()) {
      let filtered = [...memoryStore.users];
      if (role && role !== 'ALL') {
        filtered = filtered.filter((u) => u.role === role);
      }
      if (search) {
        const q = (search as string).toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        );
      }

      res.json({
        success: true,
        total: filtered.length,
        currentPage: 1,
        totalPages: 1,
        users: filtered,
      });
      return;
    }

    const filter: any = {};
    if (role && role !== 'ALL') {
      filter.role = role;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { email: { $regex: search as string, $options: 'i' } },
        { phone: { $regex: search as string, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      total: users.length,
      currentPage: 1,
      totalPages: 1,
      users,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch users' });
  }
};

// Toggle user status
export const toggleUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isMongoConnected()) {
      const u = memoryStore.users.find((item) => item._id === id || item.id === id);
      if (u) {
        u.isActive = !u.isActive;
      }
      res.json({ success: true, message: 'User status updated', user: u });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User account has been ${user.isActive ? 'activated' : 'deactivated'}`,
      user: { id: user._id, isActive: user.isActive },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to toggle user status' });
  }
};

// Save Hospital
export const saveHospital = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const hospitalData = req.body;

    if (!isMongoConnected()) {
      res.json({ success: true, message: 'Hospital saved successfully' });
      return;
    }

    let hospital;
    if (id) {
      hospital = await Hospital.findByIdAndUpdate(id, hospitalData, { new: true });
    } else {
      hospital = await Hospital.create(hospitalData);
    }

    res.json({ success: true, message: 'Hospital saved successfully', hospital });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to save hospital' });
  }
};
