import { PrismaClient, Role, AmbulanceType, RequestStatus, TripType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ---------------------------------------------------------------
// APNE SHEHAR KA CENTER YAHAN BADLO (Google Maps me right click -> lat,lng copy)
// ---------------------------------------------------------------
const CITY = { name: 'Nagpur', lat: 21.1458, lng: 79.0882 };

// Chhota helper: shehar ke center se thoda hat ke location banata hai (0.01 = lagbhag 1 km)
const near = (dLat: number, dLng: number) => ({
  lat: CITY.lat + dLat,
  lng: CITY.lng + dLng,
});

// Aaj se shuru hone wale agle 7 din (YYYY-MM-DD)
function nextDays(count: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < count; i++) {
    days.push(new Date(Date.now() + i * 24 * 3600 * 1000).toISOString().split('T')[0]);
  }
  return days;
}

async function main() {
  console.log('Clearing database...');
  await prisma.appointment.deleteMany();
  await prisma.doctorSlot.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.emergencyRequest.deleteMany();
  await prisma.ambulance.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.hospital.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding users...');
  const salt = bcrypt.genSaltSync(10);
  const commonPasswordHash = bcrypt.hashSync('password123', salt);

  // 1. Super Admin
  await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'superadmin@lifelink.com',
      passwordHash: commonPasswordHash,
      role: Role.SUPER_ADMIN,
      phone: '+915550100',
    },
  });

  // 2. Demo hospitals + hospital admins (near the city center)
  const hospitalData = [
    {
      adminEmail: 'admin.city@lifelink.com',
      adminName: 'Dr. Meera Joshi',
      hospitalName: 'LifeLink City Hospital',
      address: `Demo Road, ${CITY.name}`,
      phone: '+915550111',
      ...near(0.010, 0.008),
      beds: 12,
    },
    {
      adminEmail: 'admin.care@lifelink.com',
      adminName: 'Dr. Suresh Patil',
      hospitalName: 'LifeLink Care Hospital',
      address: `Sample Nagar, ${CITY.name}`,
      phone: '+915550112',
      ...near(-0.015, 0.020),
      beds: 8,
    },
    {
      adminEmail: 'admin.medical@lifelink.com',
      adminName: 'Dr. Kavita Rao',
      hospitalName: 'LifeLink Medical Center',
      address: `Test Colony, ${CITY.name}`,
      phone: '+915550113',
      ...near(0.025, -0.012),
      beds: 5,
    },
  ];

  const hospitals: any[] = [];
  for (const h of hospitalData) {
    const admin = await prisma.user.create({
      data: {
        name: h.adminName,
        email: h.adminEmail,
        passwordHash: commonPasswordHash,
        role: Role.ADMIN_HOSPITAL,
        phone: h.phone,
      },
    });

    const hospital = await prisma.hospital.create({
      data: {
        name: h.hospitalName,
        address: h.address,
        contactNumber: h.phone,
        lat: h.lat,
        lng: h.lng,
        adminUserId: admin.id,
        availableBeds: h.beds,
      },
    });
    hospitals.push(hospital);
  }

  // 3. Doctors + time slots for every hospital
  console.log('Seeding doctors and slots...');
  const doctorsByHospital = [
    [
      { name: 'Dr. Rahul Verma', specialization: 'Cardiology', qualifications: 'MBBS, MD (Cardiology)', experienceYears: 14, consultationFee: 800 },
      { name: 'Dr. Priya Nair', specialization: 'General Medicine', qualifications: 'MBBS, MD (Medicine)', experienceYears: 9, consultationFee: 400 },
      { name: 'Dr. Amit Deshmukh', specialization: 'Orthopedics', qualifications: 'MBBS, MS (Ortho)', experienceYears: 11, consultationFee: 600 },
      { name: 'Dr. Sneha Kulkarni', specialization: 'Pediatrics', qualifications: 'MBBS, DCH', experienceYears: 7, consultationFee: 500 },
    ],
    [
      { name: 'Dr. Vikram Singh', specialization: 'Neurology', qualifications: 'MBBS, DM (Neurology)', experienceYears: 16, consultationFee: 900 },
      { name: 'Dr. Anjali Mehta', specialization: 'General Medicine', qualifications: 'MBBS, MD', experienceYears: 8, consultationFee: 350 },
      { name: 'Dr. Rohan Gupta', specialization: 'Dermatology', qualifications: 'MBBS, MD (Derma)', experienceYears: 6, consultationFee: 500 },
      { name: 'Dr. Neha Bhat', specialization: 'Gynecology', qualifications: 'MBBS, MS (OBG)', experienceYears: 12, consultationFee: 700 },
    ],
    [
      { name: 'Dr. Sanjay Iyer', specialization: 'Cardiology', qualifications: 'MBBS, DM (Cardiology)', experienceYears: 18, consultationFee: 1000 },
      { name: 'Dr. Pooja Reddy', specialization: 'Pediatrics', qualifications: 'MBBS, MD (Pediatrics)', experienceYears: 10, consultationFee: 450 },
      { name: 'Dr. Manish Tiwari', specialization: 'Orthopedics', qualifications: 'MBBS, MS (Ortho)', experienceYears: 13, consultationFee: 650 },
      { name: 'Dr. Farah Khan', specialization: 'General Medicine', qualifications: 'MBBS, MD', experienceYears: 5, consultationFee: 300 },
    ],
  ];

  const slotTimes = [
    { startTime: '09:00', endTime: '10:00' },
    { startTime: '10:00', endTime: '11:00' },
    { startTime: '11:00', endTime: '12:00' },
    { startTime: '16:00', endTime: '17:00' },
  ];
  const days = nextDays(7);

  for (let i = 0; i < hospitals.length; i++) {
    for (const d of doctorsByHospital[i]) {
      const doctor = await prisma.doctor.create({
        data: {
          hospitalId: hospitals[i].id,
          name: d.name,
          specialization: d.specialization,
          qualifications: d.qualifications,
          experienceYears: d.experienceYears,
          consultationFee: d.consultationFee,
        },
      });

      const slotRows = [];
      for (const day of days) {
        for (const t of slotTimes) {
          slotRows.push({
            doctorId: doctor.id,
            date: day,
            startTime: t.startTime,
            endTime: t.endTime,
            maxPatients: 5,
            bookedCount: 0,
          });
        }
      }
      await prisma.doctorSlot.createMany({ data: slotRows });
    }
  }

  // 4. Ambulance drivers & vehicles (near the city center)
  const driverData = [
    {
      email: 'driver.mike@lifelink.com',
      name: 'Michael Miller',
      phone: '+915550201',
      vehicle: 'AMB-101',
      type: AmbulanceType.BASIC_LIFE_SUPPORT,
      isAvailable: true,
      ...near(0.004, 0.003),
      hospitalIndex: 0,
      verificationStatus: 'APPROVED',
      licenseNumber: 'DL-DEMO1001',
    },
    {
      email: 'driver.john@lifelink.com',
      name: 'John Fletcher',
      phone: '+915550202',
      vehicle: 'AMB-202',
      type: AmbulanceType.ADVANCED_LIFE_SUPPORT,
      isAvailable: true,
      ...near(-0.006, 0.009),
      hospitalIndex: 1,
      verificationStatus: 'APPROVED',
      licenseNumber: 'DL-DEMO1002',
    },
    {
      email: 'driver.sam@lifelink.com',
      name: 'Samantha Cruz',
      phone: '+915550203',
      vehicle: 'AMB-303',
      type: AmbulanceType.OXYGEN_SUPPORT,
      isAvailable: true,
      ...near(0.012, -0.007),
      hospitalIndex: 2,
      verificationStatus: 'APPROVED',
      licenseNumber: 'DL-DEMO1003',
    },
    {
      email: 'driver.danny@lifelink.com',
      name: 'Daniel Peterson',
      phone: '+915550204',
      vehicle: 'AMB-404',
      type: AmbulanceType.ADVANCED_LIFE_SUPPORT,
      isAvailable: false,
      ...near(-0.011, -0.010),
      hospitalIndex: 0,
      verificationStatus: 'PENDING',
      licenseNumber: 'DL-DEMO1004',
    },
    {
      email: 'driver.lily@lifelink.com',
      name: 'Lily Evans',
      phone: '+915550205',
      vehicle: 'AMB-505',
      type: AmbulanceType.BASIC_LIFE_SUPPORT,
      isAvailable: false,
      ...near(0.018, 0.014),
      hospitalIndex: 1,
      verificationStatus: 'PENDING',
      licenseNumber: 'DL-DEMO1005',
    },
  ];

  const drivers: any[] = [];
  for (const d of driverData) {
    const hospital = hospitals[d.hospitalIndex];
    const user = await prisma.user.create({
      data: {
        name: d.name,
        email: d.email,
        passwordHash: commonPasswordHash,
        role: Role.DRIVER,
        phone: d.phone,
        hospitalId: hospital.id,
      },
    });

    await prisma.ambulance.create({
      data: {
        driverId: user.id,
        vehicleNumber: d.vehicle,
        ambulanceType: d.type,
        isAvailable: d.isAvailable,
        currentLat: d.lat,
        currentLng: d.lng,
        hospitalId: hospital.id,
        licenseNumber: d.licenseNumber,
        licenseDoc: `/uploads/mock-license-${d.vehicle.toLowerCase()}.jpg`,
        registrationDoc: `/uploads/mock-reg-${d.vehicle.toLowerCase()}.jpg`,
        verificationStatus: d.verificationStatus as any,
      },
    });
    drivers.push(user);
  }

  // 5. Patients & Patient Profiles
  const patientData = [
    {
      email: 'patient.john@gmail.com',
      name: 'John Doe',
      phone: '+915550301',
      bloodGroup: 'O+',
      allergies: 'Penicillin, Shellfish',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '+915550309',
      medicalNotes: 'Hypertension. Takes lisinopril 10mg daily.',
    },
    {
      email: 'patient.alice@gmail.com',
      name: 'Alice Smith',
      phone: '+915550302',
      bloodGroup: 'A-',
      allergies: 'Peanuts, Tree nuts',
      emergencyContactName: 'Robert Smith',
      emergencyContactPhone: '+915550308',
      medicalNotes: 'Asthmatic, carries albuterol inhaler.',
    },
    {
      email: 'patient.bob@gmail.com',
      name: 'Bob Johnson',
      phone: '+915550303',
      bloodGroup: 'B+',
      allergies: 'None',
      emergencyContactName: 'Carol Johnson',
      emergencyContactPhone: '+915550307',
      medicalNotes: 'Diabetic Type II. Metformin managed.',
    },
  ];

  const patients: any[] = [];
  for (const p of patientData) {
    const user = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        passwordHash: commonPasswordHash,
        role: Role.PATIENT,
        phone: p.phone,
      },
    });

    await prisma.patientProfile.create({
      data: {
        userId: user.id,
        bloodGroup: p.bloodGroup,
        allergies: p.allergies,
        emergencyContactName: p.emergencyContactName,
        emergencyContactPhone: p.emergencyContactPhone,
        medicalNotes: p.medicalNotes,
      },
    });
    patients.push(user);
  }

  // 6. Past completed emergency logs
  console.log('Seeding past emergency logs...');
  const pastTrips = [
    {
      patientId: patients[0].id,
      driverId: drivers[0].id,
      hospitalId: hospitals[0].id,
      pickupLat: near(0.006, 0.004).lat,
      pickupLng: near(0.006, 0.004).lng,
      status: RequestStatus.COMPLETED,
      tripType: TripType.STANDARD,
      etaMinutes: 12,
      createdAt: new Date(Date.now() - 3 * 3600 * 1000),
      completedAt: new Date(Date.now() - 2.5 * 3600 * 1000),
    },
    {
      patientId: patients[1].id,
      driverId: drivers[1].id,
      hospitalId: hospitals[1].id,
      pickupLat: near(-0.004, 0.012).lat,
      pickupLng: near(-0.004, 0.012).lng,
      status: RequestStatus.COMPLETED,
      tripType: TripType.SOS,
      etaMinutes: 8,
      createdAt: new Date(Date.now() - 1.5 * 3600 * 1000),
      completedAt: new Date(Date.now() - 1.2 * 3600 * 1000),
    },
    {
      patientId: patients[2].id,
      driverId: drivers[2].id,
      hospitalId: hospitals[2].id,
      pickupLat: near(0.015, -0.005).lat,
      pickupLng: near(0.015, -0.005).lng,
      status: RequestStatus.COMPLETED,
      tripType: TripType.STANDARD,
      etaMinutes: 15,
      createdAt: new Date(Date.now() - 45 * 60 * 1000),
      completedAt: new Date(Date.now() - 20 * 60 * 1000),
    },
  ];

  for (const trip of pastTrips) {
    await prisma.emergencyRequest.create({ data: trip });
  }

  console.log('Database seeding successfully completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });