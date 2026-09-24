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
  hospitalId?: string;
  hospitalName?: string;
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
      line1: 'Lilavati Hospital Suite 102, Bandra West',
      line2: 'Mumbai, Maharashtra',
    },
    available: true,
    hospitalId: 'hosp_lilavati',
    hospitalName: 'Lilavati Hospital & Research Centre',
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
