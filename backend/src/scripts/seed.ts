import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { Hospital } from '../models/Hospital';
import { Doctor } from '../models/Doctor';
import { Ambulance } from '../models/Ambulance';
import { Appointment } from '../models/Appointment';
import { AmbulanceBooking } from '../models/AmbulanceBooking';
import { Rating } from '../models/Rating';

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('[Seed] Connected to database. Clearing existing collections...');

    await User.deleteMany({});
    await Hospital.deleteMany({});
    await Doctor.deleteMany({});
    await Ambulance.deleteMany({});
    await Appointment.deleteMany({});
    await AmbulanceBooking.deleteMany({});
    await Rating.deleteMany({});

    console.log('[Seed] Creating Hospitals...');
    const hospitalCentral = await Hospital.create({
      name: 'LifeLink Central Trauma & Multi-Specialty Hospital',
      address: 'Plot 42, Bandra Kurla Complex, Mumbai',
      city: 'Mumbai',
      location: { lat: 19.0668, lng: 72.8682 },
      contactNumber: '+91 22 2654 8800',
      emergencyNumber: '+91 22 2654 9999',
      totalBeds: 180,
      availableBeds: 34,
      icuBedsAvailable: 8,
      departments: ['Emergency & Trauma', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General Surgery'],
    });

    const hospitalApollo = await Hospital.create({
      name: 'Apollo Apex Emergency & Research Center',
      address: 'Near Western Express Highway, Andheri East, Mumbai',
      city: 'Mumbai',
      location: { lat: 19.1136, lng: 72.8697 },
      contactNumber: '+91 22 4000 5000',
      emergencyNumber: '+91 22 4000 9111',
      totalBeds: 240,
      availableBeds: 52,
      icuBedsAvailable: 12,
      departments: ['Emergency & Trauma', 'Cardiology', 'Pulmonology', 'Oncology', 'General Medicine'],
    });

    console.log('[Seed] Creating Users...');
    // 1. Super Admin
    const superAdmin = await User.create({
      name: 'Dr. Alexander Vance (Super Admin)',
      email: 'superadmin@lifelink.com',
      password: 'password123',
      role: 'SUPER_ADMIN',
      phone: '+91 98200 11111',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    });

    // 2. Hospital Admin
    const hospitalAdmin = await User.create({
      name: 'Sarah Jenkins (Hospital Director)',
      email: 'admin@hospital.com',
      password: 'password123',
      role: 'ADMIN_HOSPITAL',
      hospitalId: hospitalCentral._id,
      phone: '+91 98200 22222',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    });

    // 3. Doctors
    const doctorUser1 = await User.create({
      name: 'Dr. Rajesh Sharma',
      email: 'doctor1@lifelink.com',
      password: 'password123',
      role: 'DOCTOR',
      hospitalId: hospitalCentral._id,
      phone: '+91 98200 33331',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150',
    });

    const doctorUser2 = await User.create({
      name: 'Dr. Priya Desai',
      email: 'doctor2@lifelink.com',
      password: 'password123',
      role: 'DOCTOR',
      hospitalId: hospitalCentral._id,
      phone: '+91 98200 33332',
      avatar: 'https://images.unsplash.com/photo-1594824813570-874534f3a8b2?w=150',
    });

    const doctorUser3 = await User.create({
      name: 'Dr. Arvind Mehra',
      email: 'doctor3@lifelink.com',
      password: 'password123',
      role: 'DOCTOR',
      hospitalId: hospitalApollo._id,
      phone: '+91 98200 33333',
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150',
    });

    // 4. Drivers
    const driverUser1 = await User.create({
      name: 'Vikram Singh (Paramedic Driver)',
      email: 'driver1@lifelink.com',
      password: 'password123',
      role: 'DRIVER',
      hospitalId: hospitalCentral._id,
      phone: '+91 98200 44441',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    });

    const driverUser2 = await User.create({
      name: 'Ramesh Patil (ALS Specialist)',
      email: 'driver2@lifelink.com',
      password: 'password123',
      role: 'DRIVER',
      hospitalId: hospitalCentral._id,
      phone: '+91 98200 44442',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    });

    const driverUser3 = await User.create({
      name: 'Amitabh Kumar (Emergency Fast Responder)',
      email: 'driver3@lifelink.com',
      password: 'password123',
      role: 'DRIVER',
      hospitalId: hospitalApollo._id,
      phone: '+91 98200 44443',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    });

    // 5. Patient
    const patientUser = await User.create({
      name: 'Aarav Mehta',
      email: 'patient@lifelink.com',
      password: 'password123',
      role: 'PATIENT',
      phone: '+91 98200 55555',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    });

    console.log('[Seed] Creating Doctor Profiles & Slots...');
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const doctor1 = await Doctor.create({
      userId: doctorUser1._id,
      hospitalId: hospitalCentral._id,
      specialization: 'Cardiology',
      qualifications: 'MBBS, MD (Cardiology), DM - AIIMS New Delhi',
      experienceYears: 14,
      consultationFee: 800,
      bio: 'Senior Cardiologist specializing in preventive heart care, hypertension, and acute coronary management.',
      averageRating: 4.9,
      reviewCount: 48,
      isAvailableToday: true,
      availableSlots: [
        { date: today, startTime: '09:30', endTime: '10:00', isBooked: false },
        { date: today, startTime: '10:30', endTime: '11:00', isBooked: false },
        { date: today, startTime: '11:30', endTime: '12:00', isBooked: false },
        { date: today, startTime: '15:00', endTime: '15:30', isBooked: false },
        { date: tomorrow, startTime: '10:00', endTime: '10:30', isBooked: false },
        { date: tomorrow, startTime: '11:00', endTime: '11:30', isBooked: false },
      ],
    });

    const doctor2 = await Doctor.create({
      userId: doctorUser2._id,
      hospitalId: hospitalCentral._id,
      specialization: 'Neurology',
      qualifications: 'MBBS, MD, DNB (Neurology) - King Edward Memorial',
      experienceYears: 11,
      consultationFee: 750,
      bio: 'Consultant Neurologist with expertise in stroke management, migraines, and neurodegenerative disorders.',
      averageRating: 4.8,
      reviewCount: 36,
      isAvailableToday: true,
      availableSlots: [
        { date: today, startTime: '10:00', endTime: '10:30', isBooked: false },
        { date: today, startTime: '11:00', endTime: '11:30', isBooked: false },
        { date: today, startTime: '14:30', endTime: '15:00', isBooked: false },
        { date: tomorrow, startTime: '09:30', endTime: '10:00', isBooked: false },
      ],
    });

    const doctor3 = await Doctor.create({
      userId: doctorUser3._id,
      hospitalId: hospitalApollo._id,
      specialization: 'General Medicine',
      qualifications: 'MBBS, MD (Internal Medicine)',
      experienceYears: 8,
      consultationFee: 500,
      bio: 'Internal Medicine practitioner with focus on acute viral illnesses, diabetes care, and infectious triage.',
      averageRating: 4.7,
      reviewCount: 29,
      isAvailableToday: true,
      availableSlots: [
        { date: today, startTime: '09:00', endTime: '09:30', isBooked: false },
        { date: today, startTime: '10:00', endTime: '10:30', isBooked: false },
        { date: today, startTime: '11:00', endTime: '11:30', isBooked: false },
        { date: today, startTime: '16:00', endTime: '16:30', isBooked: false },
      ],
    });

    console.log('[Seed] Creating Ambulances & Drivers...');
    const ambulance1 = await Ambulance.create({
      driverId: driverUser1._id,
      hospitalId: hospitalCentral._id,
      vehicleNumber: 'MH02EK4021',
      vehicleModel: 'Force Emergency LifeSupport Van',
      ambulanceType: 'ADVANCED_ALS',
      isOnline: true,
      status: 'AVAILABLE',
      currentLocation: {
        lat: 19.0725,
        lng: 72.8715,
        address: 'Bandra BKC Station, Mumbai',
        heading: 45,
        speed: 0,
        lastUpdated: new Date(),
      },
      baseFare: 599,
      perKmRate: 30,
      averageRating: 4.9,
      totalRides: 142,
      equipmentList: ['Ventilator', 'Defibrillator', 'Oxygen Port', 'Trauma Kit', 'Cardiac Monitor'],
    });

    const ambulance2 = await Ambulance.create({
      driverId: driverUser2._id,
      hospitalId: hospitalCentral._id,
      vehicleNumber: 'MH01CR8829',
      vehicleModel: 'Tata Winger Rapid Response Unit',
      ambulanceType: 'OXYGEN_BLS',
      isOnline: true,
      status: 'AVAILABLE',
      currentLocation: {
        lat: 19.0812,
        lng: 72.8624,
        address: 'Kurla West Junction, Mumbai',
        heading: 120,
        speed: 0,
        lastUpdated: new Date(),
      },
      baseFare: 449,
      perKmRate: 24,
      averageRating: 4.8,
      totalRides: 98,
      equipmentList: ['Dual Oxygen Cylinders', 'Stretcher Bed', 'Suction Machine', 'First Aid Supplies'],
    });

    const ambulance3 = await Ambulance.create({
      driverId: driverUser3._id,
      hospitalId: hospitalApollo._id,
      vehicleNumber: 'MH03DG1190',
      vehicleModel: 'Mahindra Bolero Maxi Ambulance',
      ambulanceType: 'BASIC',
      isOnline: true,
      status: 'AVAILABLE',
      currentLocation: {
        lat: 19.1085,
        lng: 72.8642,
        address: 'Andheri East Highway Hub, Mumbai',
        heading: 270,
        speed: 0,
        lastUpdated: new Date(),
      },
      baseFare: 349,
      perKmRate: 20,
      averageRating: 4.7,
      totalRides: 64,
      equipmentList: ['Standard Stretcher', 'Oxygen Mask Kit', 'Blood Pressure Monitor', 'Splints'],
    });

    console.log('[Seed] Creating Sample Appointments...');
    await Appointment.create({
      patientId: patientUser._id,
      doctorId: doctor1._id,
      hospitalId: hospitalCentral._id,
      slotDate: today,
      slotTime: '09:30',
      status: 'BOOKED',
      symptoms: 'Mild chest tightness after exercise and erratic blood pressure readings.',
      notes: 'Patient requested ECG and Lipid panel review.',
      consultationFee: 800,
      paymentStatus: 'PAID',
    });

    console.log('[Seed] Creating Sample Ambulance Booking...');
    await AmbulanceBooking.create({
      patientId: patientUser._id,
      driverId: driverUser1._id,
      ambulanceId: ambulance1._id,
      hospitalId: hospitalCentral._id,
      pickupLocation: {
        lat: 19.0685,
        lng: 72.8655,
        address: 'Apartment 402, Green Meadows, Bandra East',
      },
      destinationLocation: {
        lat: 19.0668,
        lng: 72.8682,
        address: 'LifeLink Central Trauma Hospital',
      },
      ambulanceType: 'ADVANCED_ALS',
      tripType: 'STANDARD',
      status: 'COMPLETED',
      fare: 620,
      distanceKm: 2.4,
      etaMinutes: 6,
      completedAt: new Date(Date.now() - 3600000),
    });

    console.log('[Seed] Creating Sample Ratings...');
    await Rating.create({
      reviewerId: patientUser._id,
      targetType: 'DOCTOR',
      targetId: doctor1._id,
      rating: 5,
      comment: 'Dr. Rajesh was extremely thorough, compassionate, and answered every single question.',
    });

    await Rating.create({
      reviewerId: patientUser._id,
      targetType: 'DRIVER',
      targetId: driverUser1._id,
      rating: 5,
      comment: 'Ambulance arrived in 4 minutes! Driver Vikram was extremely professional and swift.',
    });

    console.log('--------------------------------------------------');
    console.log('✅ DATABASE SEED COMPLETED SUCCESSFULLY!');
    console.log('--------------------------------------------------');
    console.log('DEMO ACCOUNTS READY TO USE:');
    console.log('1. Patient:       patient@lifelink.com     / password123');
    console.log('2. Doctor:        doctor1@lifelink.com     / password123');
    console.log('3. Driver:        driver1@lifelink.com     / password123');
    console.log('4. Hospital Admin:admin@hospital.com       / password123');
    console.log('5. Super Admin:   superadmin@lifelink.com  / password123');
    console.log('--------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedDatabase();
