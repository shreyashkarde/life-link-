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

// Attach password to initial doctors
initialDoctors.forEach((d) => {
  (d as any).password = demoDocPasswordHash;
});

const todayDate = new Date();
const formattedToday = `${todayDate.getDate()}_${todayDate.getMonth() + 1}_${todayDate.getFullYear()}`;

initialDoctors[0].slots_booked = {
  [formattedToday]: ['10:30 am'],
};

const initialAppointments = [
  {
    _id: 'appt_1',
    userId: 'user_1',
    docId: 'doc_1',
    slotDate: formattedToday,
    slotTime: '10:30 am',
    userData: { ...initialUsers[0] },
    docData: { ...initialDoctors[0] },
    amount: 50,
    date: Date.now() - 3600000,
    cancelled: false,
    payment: true,
    isCompleted: false,
    createdAt: new Date().toISOString(),
  },
];

export interface PrescriptoStore {
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
    assignedHospital: 'City Care Central Hospital',
    rating: 4.9,
    reviewCount: 42,
    equipmentList: ['Oxygen Tank', 'Defibrillator (AED)', 'ECG Monitor', 'Emergency Stretcher', 'Trauma Kit'],
  },
  {
    _id: 'amb_102',
    driverName: 'Vikas Sharma',
    driverPhone: '+91 98202 10200',
    driverEmail: 'driver2@prescripto.com',
    driverId: 'driver_2',
    vehicleNumber: 'MH-02-CP-1102',
    ambulanceType: 'BASIC',
    currentLocation: {
      lat: 19.0896,
      lng: 72.8656,
      address: 'Santacruz East Station, Mumbai',
      heading: 90,
      lastUpdated: new Date(),
    },
    isAvailable: true,
    currentStatus: 'IDLE',
    assignedHospital: 'Metro Trauma Center',
    rating: 4.8,
    reviewCount: 29,
    equipmentList: ['Oxygen Tank', 'First-Aid Kit', 'Stretcher'],
  },
  {
    _id: 'amb_105',
    driverName: 'Amit Patel',
    driverPhone: '+91 98203 10500',
    driverEmail: 'driver3@prescripto.com',
    driverId: 'driver_3',
    vehicleNumber: 'MH-03-TR-1105',
    ambulanceType: 'ICU',
    currentLocation: {
      lat: 19.0600,
      lng: 72.8360,
      address: 'Worli Sea Face, Mumbai',
      heading: 180,
      lastUpdated: new Date(),
    },
    isAvailable: true,
    currentStatus: 'IDLE',
    assignedHospital: 'Apex Heart Institute',
    rating: 5.0,
    reviewCount: 38,
    equipmentList: ['Ventilator', 'Defibrillator', 'Infusion Pump', 'Cardiac Monitor'],
  },
  {
    _id: 'amb_112',
    driverName: 'Sunil Jadhav',
    driverPhone: '+91 98204 11200',
    driverEmail: 'driver4@prescripto.com',
    driverId: 'driver_4',
    vehicleNumber: 'MH-04-AX-1112',
    ambulanceType: 'BASIC',
    currentLocation: {
      lat: 19.1136,
      lng: 72.8697,
      address: 'Andheri East MIDC, Mumbai',
      heading: 270,
      lastUpdated: new Date(),
    },
    isAvailable: true,
    currentStatus: 'IDLE',
    assignedHospital: 'SevenHills Hospital',
    rating: 4.7,
    reviewCount: 21,
    equipmentList: ['Oxygen Tank', 'First-Aid Kit', 'Stretcher'],
  },
  {
    _id: 'amb_119',
    driverName: 'Suresh Nair',
    driverPhone: '+91 98205 11900',
    driverEmail: 'driver5@prescripto.com',
    driverId: 'driver_5',
    vehicleNumber: 'MH-02-ZZ-1119',
    ambulanceType: 'ADVANCED',
    currentLocation: {
      lat: 19.0176,
      lng: 72.8561,
      address: 'Dadar TT Circle, Mumbai',
      heading: 15,
      lastUpdated: new Date(),
    },
    isAvailable: true,
    currentStatus: 'IDLE',
    assignedHospital: 'KEM Emergency Wing',
    rating: 4.9,
    reviewCount: 50,
    equipmentList: ['Oxygen Tank', 'Defibrillator (AED)', 'ECG Monitor', 'Emergency Stretcher', 'Trauma Kit'],
  },
];

const initialAmbulanceBookings = [
  {
    _id: 'book_901',
    patientId: 'user_1',
    patientName: 'Edward Vincent',
    patientPhone: '+91 98200 99999',
    ambulanceId: 'amb_108',
    driverName: 'Rajesh Kumar',
    driverPhone: '+91 98201 10800',
    vehicleNumber: 'MH-01-EQ-1108',
    pickupLocation: {
      address: '7th Cross, Richmond Road, Bandra',
      lat: 19.0700,
      lng: 72.8700,
    },
    destinationHospital: {
      name: 'City Care Central Hospital',
      address: 'Trauma Bay & Emergency Ward, Sector 4',
      lat: 19.0760,
      lng: 72.8777,
    },
    bookingType: 'EMERGENCY_SOS',
    status: 'COMPLETED',
    emergencySeverity: 'CRITICAL_CODE_RED',
    patientCondition: 'Acute Cardiac Distress',
    fare: 150,
    paymentStatus: 'PAID_ONLINE',
    timeline: {
      bookedAt: new Date(Date.now() - 7200000),
      acceptedAt: new Date(Date.now() - 7100000),
      arrivedAt: new Date(Date.now() - 6900000),
      completedAt: new Date(Date.now() - 6000000),
    },
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

const initialRatings = [
  {
    _id: 'rate_1',
    userId: 'user_1',
    userName: 'Edward Vincent',
    targetType: 'DOCTOR',
    targetId: 'doc_1',
    rating: 5,
    review: 'Dr. Richard James was extremely thorough and attentive to my symptoms.',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'rate_2',
    userId: 'user_1',
    userName: 'Edward Vincent',
    targetType: 'DRIVER',
    targetId: 'amb_108',
    rating: 5,
    review: 'Ambulance arrived in 4 minutes flat! Oxygen and life-support on point.',
    createdAt: new Date().toISOString(),
  },
];

export const prescriptoStore: PrescriptoStore = {
  doctors: [...initialDoctors],
  users: [...initialUsers],
  appointments: [...initialAppointments],
  ambulances: [...initialAmbulances],
  ambulanceBookings: [...initialAmbulanceBookings],
  ratings: [...initialRatings],
};
