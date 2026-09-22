import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/User';
import { Doctor } from '../models/Doctor';
import { Ambulance } from '../models/Ambulance';
import { ENV } from '../config/env';
import { AuthRequest } from '../middleware/auth';
import { isMongoConnected } from '../config/db';
import { memoryStore } from '../config/mockStore';

const generateToken = (id: string, role: string): string => {
  return jwt.sign({ id, role }, ENV.JWT_SECRET, { expiresIn: '7d' });
};

// Register New User
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, phone, hospitalId, specialization, vehicleNumber, ambulanceType } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!isMongoConnected()) {
      // Memory Store Fallback
      const existing = memoryStore.users.find((u) => u.email === cleanEmail);
      if (existing) {
        res.status(409).json({ success: false, message: 'User with this email already exists.' });
        return;
      }

      const newId = `user_${Date.now()}`;
      const newUser: any = {
        _id: newId,
        id: newId,
        name,
        email: cleanEmail,
        password,
        role: role || 'PATIENT',
        phone,
        hospitalId: hospitalId || undefined,
        isActive: true,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563EB&color=fff`,
      };

      memoryStore.users.push(newUser);

      if (role === 'DOCTOR') {
        memoryStore.doctors.push({
          _id: `doc_${Date.now()}`,
          id: `doc_${Date.now()}`,
          userId: newUser,
          specialization: specialization || 'General Medicine',
          qualifications: 'MBBS, MD',
          experienceYears: 5,
          consultationFee: 500,
          averageRating: 4.8,
          reviewCount: 0,
          isAvailableToday: true,
          availableSlots: [
            { date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '10:30', isBooked: false },
            { date: new Date().toISOString().split('T')[0], startTime: '11:00', endTime: '11:30', isBooked: false },
          ],
        });
      } else if (role === 'DRIVER') {
        memoryStore.ambulances.push({
          _id: `amb_${Date.now()}`,
          id: `amb_${Date.now()}`,
          driverId: newUser,
          vehicleNumber: vehicleNumber || 'MH01AB9999',
          ambulanceType: ambulanceType || 'BASIC',
          isOnline: true,
          status: 'AVAILABLE',
          currentLocation: { lat: 19.076, lng: 72.8777, address: 'Central Station, Mumbai' },
          baseFare: 499,
          perKmRate: 25,
          averageRating: 4.9,
          totalRides: 0,
        });
      }

      const token = generateToken(newUser.id, newUser.role);
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: newUser,
      });
      return;
    }

    // Real MongoDB Flow
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      res.status(409).json({ success: false, message: 'User with this email already exists.' });
      return;
    }

    const userRole: UserRole = role || 'PATIENT';
    const user = await User.create({
      name,
      email: cleanEmail,
      password,
      role: userRole,
      phone,
      hospitalId: hospitalId || undefined,
    });

    if (userRole === 'DOCTOR') {
      await Doctor.create({
        userId: user._id,
        hospitalId: hospitalId || undefined,
        specialization: specialization || 'General Physician',
        qualifications: 'MBBS, MD',
        experienceYears: 4,
        consultationFee: 500,
        availableSlots: [
          { date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '10:30', isBooked: false },
          { date: new Date().toISOString().split('T')[0], startTime: '11:00', endTime: '11:30', isBooked: false },
        ],
      });
    }

    if (userRole === 'DRIVER') {
      await Ambulance.create({
        driverId: user._id,
        hospitalId: hospitalId || undefined,
        vehicleNumber: vehicleNumber || `MH01AB${Math.floor(1000 + Math.random() * 9000)}`,
        ambulanceType: ambulanceType || 'BASIC',
        isOnline: true,
        status: 'AVAILABLE',
        currentLocation: {
          lat: 19.076 + (Math.random() - 0.5) * 0.05,
          lng: 72.8777 + (Math.random() - 0.5) * 0.05,
          address: 'Central Hub Station, Mumbai',
          heading: 90,
          speed: 0,
          lastUpdated: new Date(),
        },
      });
    }

    const token = generateToken(user._id.toString(), user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        hospitalId: user.hospitalId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Registration failed' });
  }
};

// Login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!isMongoConnected()) {
      // Memory Store Lookup
      const user = memoryStore.users.find((u) => u.email === cleanEmail);
      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
        return;
      }

      if (user.password !== password) {
        res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
        return;
      }

      const token = generateToken(user._id || user.id, user.role);
      res.json({
        success: true,
        message: 'Login successful (LifeLink Active Engine)',
        token,
        user: {
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar,
          hospitalId: user.hospitalId,
        },
      });
      return;
    }

    // Real MongoDB Login
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
      return;
    }

    const token = generateToken(user._id.toString(), user.role);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        hospitalId: user.hospitalId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Login failed' });
  }
};

// Google OAuth Login
export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, googleId, avatar, role } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required from Google Auth.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!isMongoConnected()) {
      let user = memoryStore.users.find((u) => u.email === cleanEmail);
      if (!user) {
        user = {
          _id: `user_g_${Date.now()}`,
          id: `user_g_${Date.now()}`,
          name: name || cleanEmail.split('@')[0],
          email: cleanEmail,
          googleId,
          avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          role: role || 'PATIENT',
          isActive: true,
        };
        memoryStore.users.push(user);
      }

      const token = generateToken(user._id || user.id, user.role);
      res.json({
        success: true,
        message: 'Google login successful',
        token,
        user,
      });
      return;
    }

    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = await User.create({
        name: name || cleanEmail.split('@')[0],
        email: cleanEmail,
        googleId,
        avatar: avatar || '',
        role: role || 'PATIENT',
        isActive: true,
      });
    }

    const token = generateToken(user._id.toString(), user.role);

    res.json({
      success: true,
      message: 'Google login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        hospitalId: user.hospitalId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Google login failed' });
  }
};

// Profile
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    let extraData: any = {};

    if (!isMongoConnected()) {
      const uId = req.user._id || req.user.id;
      if (req.user.role === 'DOCTOR') {
        extraData.doctor = memoryStore.doctors.find((d) => d.userId?._id === uId || d.userId?.id === uId);
      } else if (req.user.role === 'DRIVER') {
        extraData.ambulance = memoryStore.ambulances.find((a) => a.driverId?._id === uId || a.driverId?.id === uId);
      }

      res.json({
        success: true,
        user: req.user,
        ...extraData,
      });
      return;
    }

    if (req.user.role === 'DOCTOR') {
      extraData.doctor = await Doctor.findOne({ userId: req.user._id }).populate('hospitalId');
    } else if (req.user.role === 'DRIVER') {
      extraData.ambulance = await Ambulance.findOne({ driverId: req.user._id }).populate('hospitalId');
    }

    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        avatar: req.user.avatar,
        hospitalId: req.user.hospitalId,
      },
      ...extraData,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch profile' });
  }
};
