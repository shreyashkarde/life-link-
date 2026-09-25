import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from '../models/User';
import Doctor from '../models/Doctor';
import Ambulance from '../models/Ambulance';
import Appointment from '../models/Appointment';
import AmbulanceBooking from '../models/AmbulanceBooking';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://ashutoshbhule1209_db_user:Ashutosh1209@lifeline.cenvrns.mongodb.net/lifelink_db?retryWrites=true&w=majority&appName=Lifeline';

export const cleanResetDatabase = async () => {
  try {
    console.log('🔄 Connecting to MongoDB for clean security reset...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    // 1. Clear legacy & unused data
    console.log('🧹 Purging old collections for a secure clean slate...');
    await User.deleteMany({});
    await Doctor.deleteMany({});
    await Ambulance.deleteMany({});
    await Appointment.deleteMany({});
    await AmbulanceBooking.deleteMany({});

    // Drop any legacy hospital collections if exists
    try {
      if (mongoose.connection.db) {
        await mongoose.connection.db.dropCollection('hospitals');
        await mongoose.connection.db.dropCollection('superadmins');
      }
    } catch {
      // Ignore if doesn't exist
    }

    console.log('🔒 Generating secure bcrypt hashes for core roles (Patient, Doctor, Driver)...');
    const salt = await bcrypt.genSalt(10);
    const patientPasswordHash = await bcrypt.hash('password123', salt);
    const doctorPasswordHash = await bcrypt.hash('doc123', salt);
    const driverPasswordHash = await bcrypt.hash('driver123', salt);

    // 2. Seed Clean Core Patient
    const patientUser = await User.create({
      name: 'Edward Vincent',
      email: 'patient@prescripto.com',
      password: patientPasswordHash,
      role: 'PATIENT',
      isVerified: true,
      phone: '+91 98201 11223',
      address: { line1: '42 Marine Drive', line2: 'Nariman Point', city: 'Mumbai', coordinates: { lat: 18.9438, lng: 72.8233 } },
      gender: 'Male',
      dob: '1995-06-15',
    });
    console.log(`✅ Seeded Patient User: ${patientUser.email} (ID: ${patientUser._id})`);

    // 3. Seed Clean Core Doctor
    const doctorUser = await User.create({
      name: 'Dr. Richard James',
      email: 'doc1@prescripto.com',
      password: doctorPasswordHash,
      role: 'DOCTOR',
      isVerified: true,
      phone: '+91 98201 44556',
      address: { line1: 'Apex Medical Wing', line2: 'Bandra West', city: 'Mumbai', coordinates: { lat: 19.0522, lng: 72.8295 } },
      gender: 'Male',
      dob: '1982-04-10',
    });

    const doctorProfile = await Doctor.create({
      name: 'Dr. Richard James',
      email: 'doc1@prescripto.com',
      password: doctorPasswordHash,
      image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300',
      speciality: 'General physician',
      degree: 'MBBS, MD (Medicine)',
      experience: '12 Years',
      about: 'Senior Consulting Physician with extensive experience in critical care and internal medicine.',
      available: true,
      isAvailable: true,
      fees: 50,
      address: { line1: 'Apex Medical Wing', line2: 'Bandra West' },
      date: Date.now(),
      slots_booked: {},
    });
    console.log(`✅ Seeded Doctor: ${doctorUser.email} (DocID: ${doctorProfile._id})`);

    // 4. Seed Clean Core Paramedic Driver
    const driverUser = await User.create({
      name: 'Rajesh Kumar',
      email: 'driver1@prescripto.com',
      password: driverPasswordHash,
      role: 'DRIVER',
      isVerified: true,
      phone: '+91 98201 99887',
      address: { line1: 'Emergency Dispatch Hub', line2: 'Bandra Reclamation', city: 'Mumbai', coordinates: { lat: 19.0596, lng: 72.8290 } },
      gender: 'Male',
      dob: '1990-11-20',
    });

    const ambulanceVehicle = await Ambulance.create({
      driverName: 'Rajesh Kumar',
      driverPhone: '+91 98201 99887',
      driverEmail: 'driver1@prescripto.com',
      driverId: String(driverUser._id),
      vehicleNumber: 'MH-02-EM-9911',
      ambulanceType: 'ADVANCED',
      currentLocation: {
        lat: 19.0596,
        lng: 72.8290,
        address: 'Bandra Trauma Center Dispatch Bay',
        heading: 180,
        lastUpdated: new Date(),
      },
      isAvailable: true,
      currentStatus: 'IDLE',
      rating: 4.9,
      reviewCount: 42,
    });
    console.log(`✅ Seeded Ambulance Driver: ${driverUser.email} (Vehicle: ${ambulanceVehicle.vehicleNumber})`);

    console.log('🎉 Database Clean Security Reset Completed Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑 CLEAN LOGIN CREDENTIALS:');
    console.log('  👤 Patient: patient@prescripto.com | password123');
    console.log('  👨‍⚕️ Doctor:  doc1@prescripto.com    | doc123');
    console.log('  🚑 Driver:  driver1@prescripto.com | driver123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Clean DB Reset Error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  cleanResetDatabase().then(() => process.exit(0));
}
