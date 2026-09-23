import bcrypt from 'bcryptjs';

export interface PrescriptoStore {
  doctors: any[];
  users: any[];
  appointments: any[];
}

const initialDoctors = [
  {
    _id: 'doc_1',
    name: 'Dr. Richard James',
    email: 'doc1@prescripto.com',
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400',
    speciality: 'General physician',
    degree: 'MBBS',
    experience: '4 Years',
    about:
      'Dr. Richard James has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
    fees: 50,
    address: {
      line1: '17th Cross, Richmond',
      line2: 'Circle, Ring Road, London',
    },
    available: true,
    date: Date.now(),
    slots_booked: {},
  },
  {
    _id: 'doc_2',
    name: 'Dr. Emily Larson',
    email: 'doc2@prescripto.com',
    image: 'https://images.unsplash.com/photo-1594824813570-874534f3a8b2?w=400',
    speciality: 'Gynecologist',
    degree: 'MBBS, MD',
    experience: '3 Years',
    about:
      'Dr. Emily Larson provides compassionate and expert obstetric and gynecological care for women at all stages of life.',
    fees: 60,
    address: {
      line1: '27th Cross, Richmond',
      line2: 'Circle, Ring Road, London',
    },
    available: true,
    date: Date.now(),
    slots_booked: {},
  },
  {
    _id: 'doc_3',
    name: 'Dr. Sarah Patel',
    email: 'doc3@prescripto.com',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400',
    speciality: 'Dermatologist',
    degree: 'MBBS, DVD',
    experience: '1 Year',
    about:
      'Dr. Sarah Patel is a consultant dermatologist specializing in clinical dermatology, skin rejuvenation, and pediatric skin conditions.',
    fees: 30,
    address: {
      line1: '37th Cross, Richmond',
      line2: 'Circle, Ring Road, London',
    },
    available: true,
    date: Date.now(),
    slots_booked: {},
  },
  {
    _id: 'doc_4',
    name: 'Dr. Christopher Lee',
    email: 'doc4@prescripto.com',
    image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400',
    speciality: 'Pediatricians',
    degree: 'MBBS, DCH',
    experience: '2 Years',
    about:
      'Dr. Christopher Lee is dedicated to the health and well-being of infants, children, and adolescents with preventive growth monitoring.',
    fees: 40,
    address: {
      line1: '47th Cross, Richmond',
      line2: 'Circle, Ring Road, London',
    },
    available: true,
    date: Date.now(),
    slots_booked: {},
  },
  {
    _id: 'doc_5',
    name: 'Dr. Jennifer Garcia',
    email: 'doc5@prescripto.com',
    image: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400',
    speciality: 'Neurologist',
    degree: 'MBBS, DM (Neurology)',
    experience: '4 Years',
    about:
      'Dr. Jennifer Garcia has deep expertise in managing complex neurological conditions, migraines, stroke rehabilitation, and movement disorders.',
    fees: 50,
    address: {
      line1: '57th Cross, Richmond',
      line2: 'Circle, Ring Road, London',
    },
    available: true,
    date: Date.now(),
    slots_booked: {},
  },
  {
    _id: 'doc_6',
    name: 'Dr. Andrew Williams',
    email: 'doc6@prescripto.com',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    speciality: 'Gastroenterologist',
    degree: 'MBBS, DNB',
    experience: '4 Years',
    about:
      'Dr. Andrew Williams is committed to diagnosing and treating digestive tract and liver diseases with compassionate evidence-based care.',
    fees: 50,
    address: {
      line1: '57th Cross, Richmond',
      line2: 'Circle, Ring Road, London',
    },
    available: true,
    date: Date.now(),
    slots_booked: {},
  },
  {
    _id: 'doc_7',
    name: 'Dr. Christopher Davis',
    email: 'doc7@prescripto.com',
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400',
    speciality: 'General physician',
    degree: 'MBBS',
    experience: '4 Years',
    about:
      'Dr. Christopher Davis is known for thorough clinical assessments, chronic illness management, and lifestyle counseling.',
    fees: 50,
    address: {
      line1: '17th Cross, Richmond',
      line2: 'Circle, Ring Road, London',
    },
    available: true,
    date: Date.now(),
    slots_booked: {},
  },
  {
    _id: 'doc_8',
    name: 'Dr. Timothy White',
    email: 'doc8@prescripto.com',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400',
    speciality: 'Gynecologist',
    degree: 'MBBS, MS',
    experience: '3 Years',
    about:
      'Dr. Timothy White specializes in maternal-fetal medicine, adolescent health, and laparoscopic gynecological procedures.',
    fees: 60,
    address: {
      line1: '27th Cross, Richmond',
      line2: 'Circle, Ring Road, London',
    },
    available: true,
    date: Date.now(),
    slots_booked: {},
  },
  {
    _id: 'doc_9',
    name: 'Dr. Ava Mitchell',
    email: 'doc9@prescripto.com',
    image: 'https://images.unsplash.com/photo-1591604021695-0c69b7c03381?w=400',
    speciality: 'Dermatologist',
    degree: 'MBBS, MD',
    experience: '1 Year',
    about:
      'Dr. Ava Mitchell focuses on acne therapies, aesthetic laser dermatology, and allergy management.',
    fees: 30,
    address: {
      line1: '37th Cross, Richmond',
      line2: 'Circle, Ring Road, London',
    },
    available: true,
    date: Date.now(),
    slots_booked: {},
  },
  {
    _id: 'doc_10',
    name: 'Dr. Jeffrey King',
    email: 'doc10@prescripto.com',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    speciality: 'Pediatricians',
    degree: 'MBBS',
    experience: '2 Years',
    about:
      'Dr. Jeffrey King provides comprehensive pediatric care, immunization schedules, and childhood behavioral assessments.',
    fees: 40,
    address: {
      line1: '47th Cross, Richmond',
      line2: 'Circle, Ring Road, London',
    },
    available: true,
    date: Date.now(),
    slots_booked: {},
  },
  {
    _id: 'doc_11',
    name: 'Dr. Kelly Montana',
    email: 'doc11@prescripto.com',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
    speciality: 'Neurologist',
    degree: 'MBBS',
    experience: '4 Years',
    about:
      'Dr. Kelly Montana is recognized for exceptional care in neuro-trauma recovery and peripheral neuropathy.',
    fees: 50,
    address: {
      line1: '57th Cross, Richmond',
      line2: 'Circle, Ring Road, London',
    },
    available: true,
    date: Date.now(),
    slots_booked: {},
  },
  {
    _id: 'doc_12',
    name: 'Dr. Patrick Harris',
    email: 'doc12@prescripto.com',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    speciality: 'Gastroenterologist',
    degree: 'MBBS',
    experience: '4 Years',
    about:
      'Dr. Patrick Harris specializes in therapeutic endoscopy and acid-peptic disorder remedies.',
    fees: 50,
    address: {
      line1: '57th Cross, Richmond',
      line2: 'Circle, Ring Road, London',
    },
    available: true,
    date: Date.now(),
    slots_booked: {},
  },
  {
    _id: 'doc_13',
    name: 'Dr. Chloe Evans',
    email: 'doc13@prescripto.com',
    image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400',
    speciality: 'General physician',
    degree: 'MBBS, MRCP',
    experience: '4 Years',
    about:
      'Dr. Chloe Evans delivers high-level clinical medicine and preventive care with an empathetic, personalized approach.',
    fees: 50,
    address: {
      line1: '17th Cross, Richmond',
      line2: 'Circle, Ring Road, London',
    },
    available: true,
    date: Date.now(),
    slots_booked: {},
  },
  {
    _id: 'doc_14',
    name: 'Dr. Ryan Martinez',
    email: 'doc14@prescripto.com',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    speciality: 'Gynecologist',
    degree: 'MBBS',
    experience: '3 Years',
    about:
      'Dr. Ryan Martinez has extensive experience in high-risk pregnancy consultations and wellness programs.',
    fees: 60,
    address: {
      line1: '27th Cross, Richmond',
      line2: 'Circle, Ring Road, London',
    },
    available: true,
    date: Date.now(),
    slots_booked: {},
  },
  {
    _id: 'doc_15',
    name: 'Dr. Amelia Hill',
    email: 'doc15@prescripto.com',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    speciality: 'Dermatologist',
    degree: 'MBBS',
    experience: '1 Year',
    about:
      'Dr. Amelia Hill provides personalized skin analysis, anti-aging solutions, and eczema therapies.',
    fees: 30,
    address: {
      line1: '37th Cross, Richmond',
      line2: 'Circle, Ring Road, London',
    },
    available: true,
    date: Date.now(),
    slots_booked: {},
  },
];

// Pre-hash password for demo doctor doc123
const demoDocPasswordHash = bcrypt.hashSync('doc123', 10);
const demoPatientPasswordHash = bcrypt.hashSync('password123', 10);

const initialUsers = [
  {
    _id: 'user_1',
    name: 'Edward Vincent',
    email: 'patient@prescripto.com',
    password: demoPatientPasswordHash,
    image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
    address: {
      line1: '57th Cross, Richmond',
      line2: 'Circle, Church Road, London',
    },
    gender: 'Male',
    dob: '1998-05-12',
    phone: '+1 123 456 7890',
  },
];

// Initialize doctors with clean empty slots and hospital linkage
initialDoctors.forEach((d, idx) => {
  (d as any).password = demoDocPasswordHash;
  d.slots_booked = {};
  if (idx < 6) {
    (d as any).hospitalId = 'hosp_lilavati';
    (d as any).hospitalName = 'Lilavati Hospital & Research Centre';
  } else if (idx < 11) {
    (d as any).hospitalId = 'hosp_kokilaben';
    (d as any).hospitalName = 'Kokilaben Dhirubhai Ambani Hospital';
  } else {
    (d as any).hospitalId = 'hosp_citycare';
    (d as any).hospitalName = 'City Care Central Hospital';
  }
});

export const initialHospitals = [
  {
    _id: 'hosp_lilavati',
    id: 'hosp_lilavati',
    name: 'Lilavati Hospital & Research Centre',
    address: 'Bandra Reclamation, Bandra West, Mumbai',
    city: 'Mumbai',
    traumaLevel: 'Level 1 Apex Trauma Center',
    totalBeds: 323,
    icuBedsAvailable: 14,
    adminEmail: 'hospital@prescripto.com',
    adminId: 'hosp_admin_1',
    contactPhone: '+91 22 2675 1000',
    isActive: true,
    doctorsCount: 6,
    driversCount: 2,
  },
  {
    _id: 'hosp_kokilaben',
    id: 'hosp_kokilaben',
    name: 'Kokilaben Dhirubhai Ambani Hospital',
    address: 'Rao Saheb, Achutrao Patwardhan Marg, Four Bungalows, Andheri West, Mumbai',
    city: 'Mumbai',
    traumaLevel: 'Level 1 Trauma Center',
    totalBeds: 750,
    icuBedsAvailable: 22,
    adminEmail: 'kokilaben.admin@prescripto.com',
    adminId: 'hosp_admin_2',
    contactPhone: '+91 22 4269 6969',
    isActive: true,
    doctorsCount: 5,
    driversCount: 2,
  },
  {
    _id: 'hosp_citycare',
    id: 'hosp_citycare',
    name: 'City Care Central Hospital',
    address: 'Trauma Bay & Emergency Ward, Sector 4, Mumbai',
    city: 'Mumbai',
    traumaLevel: 'Level 2 Trauma Center',
    totalBeds: 180,
    icuBedsAvailable: 8,
    adminEmail: 'citycare.admin@prescripto.com',
    adminId: 'hosp_admin_3',
    contactPhone: '+91 22 2845 2200',
    isActive: true,
    doctorsCount: 4,
    driversCount: 1,
  },
];

export interface PrescriptoStore {
  hospitals: any[];
  doctors: any[];
  users: any[];
  appointments: any[];
  ambulances: any[];
  ambulanceBookings: any[];
  ratings: any[];
}

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
      lat: 19.0760,
      lng: 72.8777,
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
  {
    _id: 'amb_102',
    driverName: 'Suresh Patil',
    driverPhone: '+91 98202 10200',
    driverEmail: 'driver2@prescripto.com',
    driverId: 'driver_2',
    vehicleNumber: 'MH-02-AB-1020',
    ambulanceType: 'ICU',
    currentLocation: {
      lat: 19.1300,
      lng: 72.8300,
      address: 'Andheri West Link Road, Mumbai',
      heading: 90,
      lastUpdated: new Date(),
    },
    isAvailable: true,
    currentStatus: 'IDLE',
    assignedHospital: 'Kokilaben Dhirubhai Ambani Hospital',
    hospitalId: 'hosp_kokilaben',
    hospitalName: 'Kokilaben Dhirubhai Ambani Hospital',
    rating: 4.8,
    reviewCount: 0,
    equipmentList: ['Oxygen Tank', 'Ventilator', 'Defibrillator', 'Suction Machine'],
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
  prescriptoStore.doctors.forEach((d) => {
    d.slots_booked = {};
  });
};

