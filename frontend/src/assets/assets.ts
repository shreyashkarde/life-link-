// Prescripto Assets and Metadata

export interface SpecialityItem {
  speciality: string;
  image: string;
  description: string;
}

export interface DoctorItem {
  _id: string;
  name: string;
  image: string;
  speciality: string;
  degree: string;
  experience: string;
  about: string;
  fees: number;
  address: {
    line1: string;
    line2: string;
  };
  available?: boolean;
  slots_booked?: Record<string, string[]>;
}

export const specialityData: SpecialityItem[] = [
  {
    speciality: 'General physician',
    image: 'https://cdn-icons-png.flaticon.com/512/387/387561.png',
    description: 'Expert primary care and chronic illness prevention',
  },
  {
    speciality: 'Gynecologist',
    image: 'https://cdn-icons-png.flaticon.com/512/865/865768.png',
    description: "Specialized women's health, obstetric, and maternal care",
  },
  {
    speciality: 'Dermatologist',
    image: 'https://cdn-icons-png.flaticon.com/512/2966/2966327.png',
    description: 'Advanced clinical skincare, acne, and allergy therapies',
  },
  {
    speciality: 'Pediatricians',
    image: 'https://cdn-icons-png.flaticon.com/512/3048/3048122.png',
    description: 'Dedicated healthcare for newborns, children, and teens',
  },
  {
    speciality: 'Neurologist',
    image: 'https://cdn-icons-png.flaticon.com/512/3004/3004458.png',
    description: 'Comprehensive neurological diagnostic and migraine relief',
  },
  {
    speciality: 'Gastroenterologist',
    image: 'https://cdn-icons-png.flaticon.com/512/2854/2854580.png',
    description: 'Therapeutic digestive health, endoscopy, and liver care',
  },
];

export const fallbackDoctors: DoctorItem[] = [
  {
    _id: 'doc_1',
    name: 'Dr. Richard James',
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
  },
  {
    _id: 'doc_2',
    name: 'Dr. Emily Larson',
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
  },
  {
    _id: 'doc_3',
    name: 'Dr. Sarah Patel',
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
  },
  {
    _id: 'doc_4',
    name: 'Dr. Christopher Lee',
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
  },
  {
    _id: 'doc_5',
    name: 'Dr. Jennifer Garcia',
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
  },
  {
    _id: 'doc_6',
    name: 'Dr. Andrew Williams',
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
  },
  {
    _id: 'doc_7',
    name: 'Dr. Christopher Davis',
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
  },
  {
    _id: 'doc_8',
    name: 'Dr. Timothy White',
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
  },
  {
    _id: 'doc_9',
    name: 'Dr. Ava Mitchell',
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
  },
  {
    _id: 'doc_10',
    name: 'Dr. Jeffrey King',
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
  },
  {
    _id: 'doc_11',
    name: 'Dr. Kelly Montana',
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
  },
  {
    _id: 'doc_12',
    name: 'Dr. Patrick Harris',
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
  },
  {
    _id: 'doc_13',
    name: 'Dr. Chloe Evans',
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
  },
  {
    _id: 'doc_14',
    name: 'Dr. Ryan Martinez',
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
  },
  {
    _id: 'doc_15',
    name: 'Dr. Amelia Hill',
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
  },
];

export const assets = {
  logo: '/lifelink_logo.png',
  lifelink_logo: '/lifelink_logo.png',
  header_img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600',
  appointment_img: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600',
  about_image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600',
  contact_image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600',
  profile_pic: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
  group_profiles: [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60',
  ],
};
