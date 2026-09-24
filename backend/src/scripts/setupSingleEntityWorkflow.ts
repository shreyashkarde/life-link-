import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env';
import { Doctor } from '../models/Doctor';
import { User } from '../models/User';
import { Hospital } from '../models/Hospital';
import { Ambulance } from '../models/Ambulance';
import { Appointment } from '../models/Appointment';
import { AmbulanceBooking } from '../models/AmbulanceBooking';
import { Rating } from '../models/Rating';
import { Notification } from '../models/Notification';
import { clearEntireStore, prescriptoStore } from '../config/prescriptoStore';

async function setupSingleEntity() {
  console.log('🔄 Connecting to MongoDB Atlas...');
  await mongoose.connect(ENV.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ Connected to MongoDB Atlas!');

  console.log('\n🧹 1. Cleaning dynamic transactional collections (Appointments, Bookings, Ratings, Notifications)...');
  await Appointment.deleteMany({});
  await AmbulanceBooking.deleteMany({});
  await Rating.deleteMany({});
  await Notification.deleteMany({});
  console.log('✅ Wiped all appointments, bookings, ratings, and notifications.');

  const docPasswordHash = await bcrypt.hash('doc123', 10);
  const patientPasswordHash = await bcrypt.hash('password123', 10);
  const driverPasswordHash = await bcrypt.hash('driver123', 10);
  const hospitalPasswordHash = await bcrypt.hash('hospital123', 10);

  // 1. HOSPITAL: Keep ONLY 1 Hospital (Lilavati Hospital & Research Centre)
  console.log('\n🏥 2. Setting up ONLY 1 Hospital: Lilavati Hospital & Research Centre...');
  await Hospital.deleteMany({ adminEmail: { $ne: 'hospital@prescripto.com' } });
  let hospital = await Hospital.findOne({ adminEmail: 'hospital@prescripto.com' });
  const hospitalData = {
    name: 'Lilavati Hospital & Research Centre',
    address: 'A-791, Bandra Reclamation, Bandra West, Mumbai',
    city: 'Mumbai',
    traumaLevel: 'Level 1 Apex Trauma Center',
    totalBeds: 323,
    icuBedsAvailable: 14,
    adminEmail: 'hospital@prescripto.com',
    adminId: 'hosp_admin_1',
    contactPhone: '+91 22 2675 1000',
    isActive: true,
    doctorsCount: 1,
    driversCount: 1,
  };
  if (!hospital) {
    hospital = await Hospital.create(hospitalData);
    console.log(`✅ Created Hospital: ${hospital.name} (_id: ${hospital._id})`);
  } else {
    await Hospital.updateOne({ _id: hospital._id }, { $set: hospitalData });
    console.log(`✅ Updated Hospital: ${hospital.name} (_id: ${hospital._id})`);
  }

  // 2. DOCTOR: Keep ONLY 1 Doctor (Dr. Richard James)
  console.log('\n👨‍⚕️ 3. Setting up ONLY 1 Doctor: Dr. Richard James...');
  await Doctor.deleteMany({ email: { $ne: 'doc1@prescripto.com' } });
  let doctor = await Doctor.findOne({ email: 'doc1@prescripto.com' });
  const doctorData = {
    name: 'Dr. Richard James',
    email: 'doc1@prescripto.com',
    password: docPasswordHash,
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400',
    speciality: 'General physician',
    degree: 'MBBS',
    experience: '4 Years',
    about: 'Dr. Richard James has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
    fees: 50,
    address: {
      line1: 'Lilavati Hospital Consultation Suite 102, Bandra West',
      line2: 'Mumbai, Maharashtra',
    },
    available: true,
    isAvailable: true,
    date: Date.now(),
    slots_booked: {},
    hospitalId: 'hosp_lilavati',
    hospitalName: 'Lilavati Hospital & Research Centre',
  };
  if (!doctor) {
    doctor = await Doctor.create(doctorData);
    console.log(`✅ Created Doctor: ${doctor.name} (_id: ${doctor._id})`);
  } else {
    await Doctor.updateOne({ _id: doctor._id }, { $set: doctorData });
    console.log(`✅ Updated Doctor: ${doctor.name} (_id: ${doctor._id})`);
  }

  // 3. PATIENT: Keep ONLY 1 Patient (Edward Vincent)
  console.log('\n🧑‍🦽 4. Setting up ONLY 1 Patient: Edward Vincent...');
  await User.deleteMany({ email: { $nin: ['patient@prescripto.com', 'hospital@prescripto.com', 'admin@prescripto.com'] } });
  let patient = await User.findOne({ email: 'patient@prescripto.com' });
  const patientData = {
    name: 'Edward Vincent',
    email: 'patient@prescripto.com',
    password: patientPasswordHash,
    role: 'PATIENT' as const,
    image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    address: {
      line1: 'Bandra Bandstand, Bandra West',
      line2: 'Mumbai, Maharashtra',
      city: 'Mumbai',
      coordinates: { lat: 19.0544, lng: 72.8277 },
    },
    gender: 'Male',
    dob: '1995-05-15',
    phone: '+91 98200 12345',
    isVerified: true,
    loginAttempts: 0,
  };
  if (!patient) {
    patient = await User.create(patientData);
    console.log(`✅ Created Patient: ${patient.name} (_id: ${patient._id})`);
  } else {
    await User.updateOne({ _id: patient._id }, { $set: patientData });
    console.log(`✅ Updated Patient: ${patient.name} (_id: ${patient._id})`);
  }

  // 4. DRIVER / AMBULANCE: Keep ONLY 1 Ambulance (Rajesh Kumar / MH-01-EQ-1108)
  console.log('\n🚑 5. Setting up ONLY 1 Paramedic Driver: Rajesh Kumar (MH-01-EQ-1108)...');
  await Ambulance.deleteMany({ vehicleNumber: { $ne: 'MH-01-EQ-1108' } });
  let ambulance = await Ambulance.findOne({ vehicleNumber: 'MH-01-EQ-1108' });
  const ambulanceData = {
    driverName: 'Rajesh Kumar',
    driverPhone: '+91 98201 10800',
    driverEmail: 'driver1@prescripto.com',
    driverId: 'driver_1',
    vehicleNumber: 'MH-01-EQ-1108',
    ambulanceType: 'ADVANCED' as const,
    currentLocation: {
      lat: 19.0544,
      lng: 72.8277,
      address: 'Bandra West Junction, Mumbai',
      heading: 45,
      lastUpdated: new Date(),
    },
    isAvailable: true,
    currentStatus: 'IDLE' as const,
    assignedHospital: 'Lilavati Hospital & Research Centre',
    hospitalId: 'hosp_lilavati',
    hospitalName: 'Lilavati Hospital & Research Centre',
    rating: 5.0,
    reviewCount: 0,
    equipmentList: ['Oxygen Tank', 'Defibrillator (AED)', 'ECG Monitor', 'Emergency Stretcher', 'Trauma Kit'],
  };
  if (!ambulance) {
    ambulance = await Ambulance.create(ambulanceData);
    console.log(`✅ Created Ambulance: ${ambulance.vehicleNumber} (${ambulance.driverName}, _id: ${ambulance._id})`);
  } else {
    await Ambulance.updateOne({ _id: ambulance._id }, { $set: ambulanceData });
    console.log(`✅ Updated Ambulance: ${ambulance.vehicleNumber} (${ambulance.driverName}, _id: ${ambulance._id})`);
  }

  // Sync in-memory store
  clearEntireStore();
  prescriptoStore.doctors = [doctorData];
  prescriptoStore.hospitals = [hospitalData];
  prescriptoStore.users = [patientData];
  prescriptoStore.ambulances = [ambulanceData];

  console.log('\n=============================================================');
  console.log('🎉 DATABASE CLEANUP COMPLETE! EXACT 1-TO-1 SETUP CONFIGURED:');
  console.log('   🏥 1 Hospital: Lilavati Hospital & Research Centre');
  console.log('   👨‍⚕️ 1 Doctor: Dr. Richard James (General physician)');
  console.log('   🧑‍🦽 1 Patient: Edward Vincent (patient@prescripto.com / password123)');
  console.log('   🚑 1 Driver: Rajesh Kumar (MH-01-EQ-1108 / driver1@prescripto.com)');
  console.log('   🧹 0 Old Appointments, 0 Old Trips, Slots Booked: {}');
  console.log('=============================================================\n');

  await mongoose.disconnect();
}

setupSingleEntity().catch((err) => {
  console.error('❌ Error configuring single entity setup:', err);
  process.exit(1);
});
