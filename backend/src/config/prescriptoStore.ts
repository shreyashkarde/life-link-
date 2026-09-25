import bcrypt from 'bcryptjs';

export interface PrescriptoStore {
  hospitals: any[];
  doctors: any[];
  users: any[];
  appointments: any[];
  ambulances: any[];
  ambulanceBookings: any[];
  ratings: any[];
}

// Pre-hashed passwords for demo logins
const demoDocPasswordHash = bcrypt.hashSync('doc123', 10);
const demoPatientPasswordHash = bcrypt.hashSync('password123', 10);

// EXACT 1 DOCTOR: Dr. Richard James
const initialDoctors = [
  {
    _id: 'doc_1',
    name: 'Dr. Richard James',
    email: 'doc1@prescripto.com',
    password: demoDocPasswordHash,
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400',
    speciality: 'General physician',
    degree: 'MBBS',
    experience: '4 Years',
    about:
      'Dr. Richard James has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
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
  },
];

// EXACT 1 PATIENT: Edward Vincent
const initialUsers = [
  {
    _id: 'user_1',
    name: 'Edward Vincent',
    email: 'patient@prescripto.com',
    password: demoPatientPasswordHash,
    image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
    address: {
      line1: 'Bandra Bandstand, Bandra West',
      line2: 'Mumbai, Maharashtra',
      city: 'Mumbai',
      coordinates: { lat: 19.0544, lng: 72.8277 },
    },
    gender: 'Male',
    dob: '1995-05-15',
    phone: '+91 98200 12345',
    role: 'PATIENT',
    isVerified: true,
  },
];

// Real Partner Hospitals in LifeLink Network
export const initialHospitals = [
  {
    _id: 'hosp_lilavati',
    id: 'hosp_lilavati',
    hospitalId: 'hosp_lilavati',
    name: 'Lilavati Hospital & Research Centre',
    address: 'A-791, Bandra Reclamation, Bandra West, Mumbai 400050',
    city: 'Mumbai',
    traumaLevel: 'Level 1 Apex Trauma Center',
    totalBeds: 323,
    icuBedsAvailable: 14,
    adminEmail: 'hospital@prescripto.com',
    adminId: 'hosp_admin_1',
    contactPhone: '+91 22 2675 1000',
    emergencyContact: '+91 22 2656 8000',
    lat: 19.0522,
    lng: 72.8295,
    location: { lat: 19.0522, lng: 72.8295 },
    rating: 4.9,
    isActive: true,
    doctorsCount: 3,
    driversCount: 1,
    specialities: ['General physician', 'Cardiology', 'Neurology', 'Trauma & Emergency'],
  },
  {
    _id: 'hosp_hinduja',
    id: 'hosp_hinduja',
    hospitalId: 'hosp_hinduja',
    name: 'P. D. Hinduja National Hospital & Medical Research Centre',
    address: 'Veer Savarkar Marg, Mahim West, Mumbai 400016',
    city: 'Mumbai',
    traumaLevel: 'Level 1 Trauma Care',
    totalBeds: 400,
    icuBedsAvailable: 18,
    adminEmail: 'hinduja@prescripto.com',
    adminId: 'hosp_admin_2',
    contactPhone: '+91 22 2445 1515',
    emergencyContact: '+91 22 2445 2222',
    lat: 19.0330,
    lng: 72.8397,
    location: { lat: 19.0330, lng: 72.8397 },
    rating: 4.8,
    isActive: true,
    doctorsCount: 2,
    driversCount: 1,
    specialities: ['Gynecologist', 'General physician', 'Oncology'],
  },
  {
    _id: 'hosp_nanavati',
    id: 'hosp_nanavati',
    hospitalId: 'hosp_nanavati',
    name: 'Nanavati Max Super Speciality Hospital',
    address: 'Swami Vivekananda Rd, Vile Parle West, Mumbai 400056',
    city: 'Mumbai',
    traumaLevel: 'Level 1 Super Speciality Apex',
    totalBeds: 350,
    icuBedsAvailable: 22,
    adminEmail: 'nanavati@prescripto.com',
    adminId: 'hosp_admin_3',
    contactPhone: '+91 22 2626 7500',
    emergencyContact: '+91 22 2618 2255',
    lat: 19.0968,
    lng: 72.8413,
    location: { lat: 19.0968, lng: 72.8413 },
    rating: 4.8,
    isActive: true,
    doctorsCount: 2,
    driversCount: 1,
    specialities: ['Dermatologist', 'General physician', 'Cardiac Sciences'],
  },
  {
    _id: 'hosp_kokilaben',
    id: 'hosp_kokilaben',
    hospitalId: 'hosp_kokilaben',
    name: 'Kokilaben Dhirubhai Ambani Hospital',
    address: 'Achutrao Patwardhan Marg, Four Bungalows, Andheri West, Mumbai 400053',
    city: 'Mumbai',
    traumaLevel: 'Level 1 Tertiary Apex Center',
    totalBeds: 750,
    icuBedsAvailable: 25,
    adminEmail: 'kokilaben@prescripto.com',
    adminId: 'hosp_admin_4',
    contactPhone: '+91 22 4269 6969',
    emergencyContact: '+91 22 4269 9999',
    lat: 19.1311,
    lng: 72.8252,
    location: { lat: 19.1311, lng: 72.8252 },
    rating: 4.9,
    isActive: true,
    doctorsCount: 3,
    driversCount: 1,
    specialities: ['Pediatricians', 'Neurologist', 'General physician'],
  },
  {
    _id: 'hosp_breach_candy',
    id: 'hosp_breach_candy',
    hospitalId: 'hosp_breach_candy',
    name: 'Breach Candy Hospital Trust',
    address: '60 A, Bhulabhai Desai Marg, Breach Candy, Mumbai 400026',
    city: 'Mumbai',
    traumaLevel: 'Level 2 Premier Care Center',
    totalBeds: 212,
    icuBedsAvailable: 12,
    adminEmail: 'breachcandy@prescripto.com',
    adminId: 'hosp_admin_5',
    contactPhone: '+91 22 2366 7788',
    emergencyContact: '+91 22 2367 1888',
    lat: 18.9712,
    lng: 72.8055,
    location: { lat: 18.9712, lng: 72.8055 },
    rating: 4.7,
    isActive: true,
    doctorsCount: 2,
    driversCount: 1,
    specialities: ['Gastroenterologist', 'General physician', 'General Surgery'],
  },
  {
    _id: 'hosp_apollo',
    id: 'hosp_apollo',
    hospitalId: 'hosp_apollo',
    name: 'Apollo Hospitals Navi Mumbai',
    address: 'Plot # 13, Off Urban Haat, Sector 23, CBD Belapur, Navi Mumbai 400614',
    city: 'Navi Mumbai',
    traumaLevel: 'Level 1 Apex Emergency Hospital',
    totalBeds: 500,
    icuBedsAvailable: 30,
    adminEmail: 'apollo@prescripto.com',
    adminId: 'hosp_admin_6',
    contactPhone: '+91 22 3350 3350',
    emergencyContact: '+91 22 3350 1066',
    lat: 19.0222,
    lng: 73.0416,
    location: { lat: 19.0222, lng: 73.0416 },
    rating: 4.9,
    isActive: true,
    doctorsCount: 2,
    driversCount: 1,
    specialities: ['Cardiology', 'Neurologist', 'Emergency Medicine'],
  },
  {
    _id: 'hosp_fortis',
    id: 'hosp_fortis',
    hospitalId: 'hosp_fortis',
    name: 'Fortis Hospital Mulund',
    address: 'Mulund Goregaon Link Rd, Industrial Area, Mulund West, Mumbai 400078',
    city: 'Mumbai',
    traumaLevel: 'Level 1 Emergency & Cardiac Care',
    totalBeds: 315,
    icuBedsAvailable: 20,
    adminEmail: 'fortis@prescripto.com',
    adminId: 'hosp_admin_7',
    contactPhone: '+91 22 4365 4365',
    emergencyContact: '+91 22 4365 4999',
    lat: 19.1663,
    lng: 72.9362,
    location: { lat: 19.1663, lng: 72.9362 },
    rating: 4.8,
    isActive: true,
    doctorsCount: 2,
    driversCount: 1,
    specialities: ['Cardiology', 'General physician', 'Pulmonology'],
  },
];

// EXACT 1 DRIVER / AMBULANCE: Rajesh Kumar (MH-01-EQ-1108)
const initialAmbulances = [
  {
    _id: 'amb_108',
    driverName: 'Rajesh Kumar',
    driverPhone: '+91 98201 10800',
    driverEmail: 'driver1@prescripto.com',
    driverId: 'driver_1',
    vehicleNumber: 'MH-01-EQ-1108',
    ambulanceType: 'ADVANCED',
    currentLocation: {
      lat: 19.0544,
      lng: 72.8277,
      address: 'Bandra West Junction, Mumbai',
      heading: 45,
      lastUpdated: new Date(),
    },
    isAvailable: true,
    currentStatus: 'IDLE',
    assignedHospital: 'Lilavati Hospital & Research Centre',
    hospitalId: 'hosp_lilavati',
    hospitalName: 'Lilavati Hospital & Research Centre',
    rating: 5.0,
    reviewCount: 0,
    equipmentList: ['Oxygen Tank', 'Defibrillator (AED)', 'ECG Monitor', 'Emergency Stretcher', 'Trauma Kit'],
  },
];

export const prescriptoStore: PrescriptoStore = {
  hospitals: [...initialHospitals],
  doctors: [...initialDoctors],
  users: [...initialUsers],
  appointments: [],
  ambulances: [...initialAmbulances],
  ambulanceBookings: [],
  ratings: [],
};

export const clearEntireStore = () => {
  prescriptoStore.appointments = [];
  prescriptoStore.ambulanceBookings = [];
  prescriptoStore.ratings = [];
  prescriptoStore.doctors = [...initialDoctors];
  prescriptoStore.doctors.forEach((d) => {
    d.slots_booked = {};
    d.available = true;
    d.isAvailable = true;
    (d as any).hospitalId = 'hosp_lilavati';
    (d as any).hospitalName = 'Lilavati Hospital & Research Centre';
  });
  prescriptoStore.hospitals = [...initialHospitals];
  prescriptoStore.ambulances = [...initialAmbulances];
  prescriptoStore.users = [...initialUsers];
};

/**
 * Auto-seeds 1 verified doctor (Dr. Richard James) to MongoDB if missing
 */
export const seedDefaultDoctorsToMongo = async () => {
  try {
    const { Doctor } = await import('../models/Doctor');
    const { isMongoConnected } = await import('./db');
    if (!isMongoConnected()) return;

    // Remove any extra doctors not matching doc1@prescripto.com
    await Doctor.deleteMany({ email: { $ne: 'doc1@prescripto.com' } });

    for (const doc of initialDoctors) {
      const exists = await Doctor.findOne({ email: doc.email });
      if (!exists) {
        await Doctor.create({
          name: doc.name,
          email: doc.email,
          password: (doc as any).password || demoDocPasswordHash,
          image: doc.image,
          speciality: doc.speciality,
          degree: doc.degree,
          experience: doc.experience,
          about: doc.about,
          fees: doc.fees,
          address: doc.address,
          available: true,
          isAvailable: true,
          date: doc.date || Date.now(),
          slots_booked: {},
          hospitalId: 'hosp_lilavati',
          hospitalName: 'Lilavati Hospital & Research Centre',
        });
      } else {
        await Doctor.updateOne(
          { _id: exists._id },
          {
            $set: {
              hospitalId: 'hosp_lilavati',
              hospitalName: 'Lilavati Hospital & Research Centre',
              available: true,
              isAvailable: true,
            },
          }
        );
      }
    }
    console.log('✓ [DB Seed] Verified 1 Doctor (Dr. Richard James) present in MongoDB.');
  } catch (err: any) {
    console.warn('[DB Seed Warning] Could not seed doctor to MongoDB:', err.message);
  }
};
