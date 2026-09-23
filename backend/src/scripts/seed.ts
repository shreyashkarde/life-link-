import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { Doctor } from '../models/Doctor';
import { Appointment } from '../models/Appointment';

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('[Seed] Connected to database. Clearing existing Prescripto collections...');

    await User.deleteMany({});
    await Doctor.deleteMany({});
    await Appointment.deleteMany({});

    console.log('[Seed] Creating Prescripto Doctors...');
    const salt = await bcrypt.genSalt(10);
    const defaultDoctorPassword = await bcrypt.hash('doc123', salt);

    const doctorsData = [
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
    ];

    const createdDoctors = [];
    for (const doc of doctorsData) {
      const newDoc = await Doctor.create({
        ...doc,
        password: defaultDoctorPassword,
        available: true,
        date: Date.now(),
        slots_booked: {},
      });
      createdDoctors.push(newDoc);
    }
    console.log(`[Seed] Seeded ${createdDoctors.length} Prescripto doctors.`);

    console.log('[Seed] Creating Prescripto Demo Patient...');
    const patientPassword = await bcrypt.hash('password123', salt);
    const demoPatient = await User.create({
      name: 'Edward Vincent',
      email: 'patient@prescripto.com',
      password: patientPassword,
      image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      address: {
        line1: '57th Cross, Richmond',
        line2: 'Circle, Church Road, London',
      },
      gender: 'Male',
      dob: '1998-05-12',
      phone: '+1 123 456 7890',
    });

    console.log('[Seed] Creating Sample Appointment...');
    const doc1 = createdDoctors[0];
    const today = new Date();
    const dateFormatted = `${today.getDate()}_${today.getMonth() + 1}_${today.getFullYear()}`;

    // Mark slot as booked on doctor
    doc1.slots_booked = {
      [dateFormatted]: ['10:30 am'],
    };
    await doc1.save();

    await Appointment.create({
      userId: demoPatient._id.toString(),
      docId: doc1._id.toString(),
      slotDate: dateFormatted,
      slotTime: '10:30 am',
      userData: {
        _id: demoPatient._id,
        name: demoPatient.name,
        email: demoPatient.email,
        phone: demoPatient.phone,
        address: demoPatient.address,
        dob: demoPatient.dob,
        gender: demoPatient.gender,
        image: demoPatient.image,
      },
      docData: {
        _id: doc1._id,
        name: doc1.name,
        speciality: doc1.speciality,
        degree: doc1.degree,
        experience: doc1.experience,
        about: doc1.about,
        fees: doc1.fees,
        address: doc1.address,
        image: doc1.image,
      },
      amount: doc1.fees,
      date: Date.now(),
      cancelled: false,
      payment: true,
      isCompleted: false,
    });

    console.log('--------------------------------------------------');
    console.log('✅ PRESCRIPTO DATABASE SEED COMPLETED SUCCESSFULLY!');
    console.log('--------------------------------------------------');
    console.log('DEMO ACCOUNTS READY TO USE:');
    console.log('1. Admin:   admin@prescripto.com   / admin123');
    console.log('2. Doctor:  doc1@prescripto.com    / doc123 (Dr. Richard James)');
    console.log('3. Patient: patient@prescripto.com / password123 (Edward Vincent)');
    console.log('--------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedDatabase();
