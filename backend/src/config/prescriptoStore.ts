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

// EXACT 1 HOSPITAL: Lilavati Hospital & Research Centre
export const initialHospitals = [
  {
    _id: 'hosp_lilavati',
    id: 'hosp_lilavati',
    name: 'Lilavati Hospital & Research Centre',
    address: 'A-791, Bandra Reclamation, Bandra West, Mumbai',
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
    rating: 4.9,
    isActive: true,
    doctorsCount: 1,
    driversCount: 1,
    specialities: ['General physician'],
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
