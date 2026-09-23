import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Doctor } from '../models/Doctor';
import { Appointment } from '../models/Appointment';
import { ENV } from '../config/env';
import { isMongoConnected } from '../config/db';
import { prescriptoStore } from '../config/prescriptoStore';

// API to register user
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Missing required details' });
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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (!isMongoConnected()) {
      const exists = prescriptoStore.users.find((u) => u.email === email);
      if (exists) {
        res.status(400).json({ success: false, message: 'User already exists with this email' });
        return;
      }

      const newUser = {
        _id: `user_${Date.now()}`,
        name,
        email,
        password: hashedPassword,
        image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
        address: { line1: '', line2: '' },
        gender: 'Not Selected',
        dob: 'Not Selected',
        phone: '0000000000',
      };
      prescriptoStore.users.push(newUser);

      const token = jwt.sign({ id: newUser._id }, ENV.JWT_SECRET, {
        expiresIn: '7d',
      });
      res.json({ success: true, token, user: { name: newUser.name, email: newUser.email } });
      return;
    }

    const exists = await User.findOne({ email });
    if (exists) {
      res.status(400).json({ success: false, message: 'User already exists with this email' });
      return;
    }

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    const user = await newUser.save();

    const token = jwt.sign({ id: user._id }, ENV.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ success: true, token, user: { name: user.name, email: user.email } });
  } catch (error: any) {
    console.error('Register User Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API for user login
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!isMongoConnected()) {
      const user = prescriptoStore.users.find((u) => u.email === email);
      if (!user) {
        res.status(400).json({ success: false, message: 'User does not exist' });
        return;
      }
      const isMatch = await bcrypt.compare(password, user.password || '');
      if (!isMatch) {
        res.status(400).json({ success: false, message: 'Invalid password' });
        return;
      }
      const token = jwt.sign({ id: user._id }, ENV.JWT_SECRET, {
        expiresIn: '7d',
      });
      res.json({ success: true, token, user: { name: user.name, email: user.email } });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ success: false, message: 'User does not exist' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Invalid password' });
      return;
    }

    const token = jwt.sign({ id: user._id }, ENV.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ success: true, token, user: { name: user.name, email: user.email } });
  } catch (error: any) {
    console.error('Login User Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to get user profile data
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.userId || res.locals.userId;

    if (!isMongoConnected()) {
      const user = prescriptoStore.users.find((u) => u._id === userId || u.id === userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      const { password, ...userData } = user;
      res.json({ success: true, userData });
      return;
    }

    const userData = await User.findById(userId).select('-password');
    if (!userData) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, userData });
  } catch (error: any) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to update user profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.userId || res.locals.userId;
    const { name, phone, address, dob, gender, image } = req.body;

    if (!name || !phone || !dob || !gender) {
      res.status(400).json({ success: false, message: 'Incomplete profile data' });
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

    if (!isMongoConnected()) {
      const user = prescriptoStore.users.find((u) => u._id === userId || u.id === userId);
      if (user) {
        user.name = name;
        user.phone = phone;
        user.address = parsedAddress;
        user.dob = dob;
        user.gender = gender;
        if (image) user.image = image;
      }
      res.json({ success: true, message: 'Profile Updated Successfully' });
      return;
    }

    const updateData: any = {
      name,
      phone,
      address: parsedAddress,
      dob,
      gender,
    };

    if (image) {
      updateData.image = image;
    }

    await User.findByIdAndUpdate(userId, updateData);

    res.json({ success: true, message: 'Profile Updated Successfully' });
  } catch (error: any) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to book appointment
export const bookAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.userId || res.locals.userId;
    const { docId, slotDate, slotTime } = req.body;

    if (!docId || !slotDate || !slotTime) {
      res.status(400).json({ success: false, message: 'Missing appointment scheduling parameters' });
      return;
    }

    if (!isMongoConnected()) {
      const doc = prescriptoStore.doctors.find((d) => d._id === docId || d.id === docId);
      if (!doc) {
        res.status(404).json({ success: false, message: 'Doctor not found' });
        return;
      }
      if (!doc.available) {
        res.status(400).json({ success: false, message: 'Doctor is currently not available for bookings' });
        return;
      }

      doc.slots_booked = doc.slots_booked || {};
      if (doc.slots_booked[slotDate]) {
        if (doc.slots_booked[slotDate].includes(slotTime)) {
          res.status(400).json({ success: false, message: 'This slot is already booked. Please choose another time.' });
          return;
        } else {
          doc.slots_booked[slotDate].push(slotTime);
        }
      } else {
        doc.slots_booked[slotDate] = [slotTime];
      }

      const user = prescriptoStore.users.find((u) => u._id === userId || u.id === userId);
      const newAppt = {
        _id: `appt_${Date.now()}`,
        userId,
        docId,
        slotDate,
        slotTime,
        userData: user || { name: 'Patient' },
        docData: {
          _id: doc._id,
          name: doc.name,
          speciality: doc.speciality,
          degree: doc.degree,
          experience: doc.experience,
          about: doc.about,
          fees: doc.fees,
          address: doc.address,
          image: doc.image,
        },
        amount: doc.fees,
        date: Date.now(),
        cancelled: false,
        payment: false,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      };

      prescriptoStore.appointments.unshift(newAppt);
      res.json({ success: true, message: 'Appointment Booked Successfully!' });
      return;
    }

    const docData = await Doctor.findById(docId).select('-password');
    if (!docData) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    if (!docData.available) {
      res.status(400).json({ success: false, message: 'Doctor is currently not available for bookings' });
      return;
    }

    let slots_booked = docData.slots_booked || {};

    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        res.status(400).json({ success: false, message: 'This slot is already booked. Please choose another time.' });
        return;
      } else {
        slots_booked[slotDate].push(slotTime);
      }
    } else {
      slots_booked[slotDate] = [slotTime];
    }

    const userData = await User.findById(userId).select('-password');
    if (!userData) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const docSnapshot = {
      _id: docData._id,
      name: docData.name,
      speciality: docData.speciality,
      degree: docData.degree,
      experience: docData.experience,
      about: docData.about,
      fees: docData.fees,
      address: docData.address,
      image: docData.image,
    };

    const appointmentData = {
      userId,
      docId,
      userData,
      docData: docSnapshot,
      amount: docData.fees,
      slotTime,
      slotDate,
      date: Date.now(),
      cancelled: false,
      payment: false,
      isCompleted: false,
    };

    const newAppointment = new Appointment(appointmentData);
    await newAppointment.save();

    await Doctor.findByIdAndUpdate(docId, { slots_booked });

    res.json({ success: true, message: 'Appointment Booked Successfully!' });
  } catch (error: any) {
    console.error('Book Appointment Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to get user appointments for frontend 'My Appointments' page
export const listAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.userId || res.locals.userId;

    if (!isMongoConnected()) {
      const appointments = prescriptoStore.appointments.filter(
        (a) => a.userId === userId || a.userData?._id === userId
      );
      res.json({ success: true, appointments });
      return;
    }

    const appointments = await Appointment.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, appointments });
  } catch (error: any) {
    console.error('List Appointments Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to cancel appointment
export const cancelAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.userId || res.locals.userId;
    const { appointmentId } = req.body;

    if (!isMongoConnected()) {
      const appt = prescriptoStore.appointments.find((a) => a._id === appointmentId);
      if (!appt) {
        res.status(404).json({ success: false, message: 'Appointment not found' });
        return;
      }
      if (appt.userId.toString() !== userId.toString()) {
        res.status(403).json({ success: false, message: 'Unauthorized action' });
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

    if (appointmentData.userId.toString() !== userId.toString()) {
      res.status(403).json({ success: false, message: 'Unauthorized action' });
      return;
    }

    appointmentData.cancelled = true;
    await appointmentData.save();

    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await Doctor.findById(docId);

    if (doctorData && doctorData.slots_booked && doctorData.slots_booked[slotDate]) {
      doctorData.slots_booked[slotDate] = doctorData.slots_booked[slotDate].filter(
        (time: string) => time !== slotTime
      );
      doctorData.markModified('slots_booked');
      await doctorData.save();
    }

    res.json({ success: true, message: 'Appointment Cancelled Successfully' });
  } catch (error: any) {
    console.error('Cancel Appointment Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to complete payment
export const paymentComplete = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.userId || res.locals.userId;
    const { appointmentId, paymentMethod = 'Online' } = req.body;

    if (!isMongoConnected()) {
      const appt = prescriptoStore.appointments.find((a) => a._id === appointmentId);
      if (!appt) {
        res.status(404).json({ success: false, message: 'Appointment not found' });
        return;
      }
      if (appt.userId.toString() !== userId.toString()) {
        res.status(403).json({ success: false, message: 'Unauthorized action' });
        return;
      }
      appt.payment = true;
      res.json({
        success: true,
        message: `Payment of $${appt.amount} completed via ${paymentMethod}!`,
      });
      return;
    }

    const appointmentData = await Appointment.findById(appointmentId);
    if (!appointmentData) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    if (appointmentData.userId.toString() !== userId.toString()) {
      res.status(403).json({ success: false, message: 'Unauthorized action' });
      return;
    }

    appointmentData.payment = true;
    await appointmentData.save();

    res.json({
      success: true,
      message: `Payment of $${appointmentData.amount} completed via ${paymentMethod}!`,
    });
  } catch (error: any) {
    console.error('Payment Complete Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
