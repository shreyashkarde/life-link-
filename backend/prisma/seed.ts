import { PrismaClient, Role, AmbulanceType, RequestStatus, TripType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.emergencyRequest.deleteMany();
  await prisma.ambulance.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.hospital.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding users...');
  const salt = bcrypt.genSaltSync(10);
  const commonPasswordHash = bcrypt.hashSync('password123', salt);

  // 1. Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'superadmin@lifelink.com',
      passwordHash: commonPasswordHash,
      role: Role.SUPER_ADMIN,
      phone: '+15550100',
    },
  });

  // 2. Hospital Admins & Hospitals (San Francisco area coordinates)
  const hospitalData = [
    {
      adminEmail: 'admin.sfgeneral@lifelink.com',
      adminName: 'Dr. Sarah Connor',
      hospitalName: 'San Francisco General Hospital',
      address: '1001 Potrero Ave, San Francisco, CA 94110',
      phone: '+15550111',
      lat: 37.7556,
      lng: -122.4047,
      beds: 12,
    },
    {
      adminEmail: 'admin.ucsf@lifelink.com',
      adminName: 'Dr. Robert Chen',
      hospitalName: 'UCSF Medical Center',
      address: '505 Parnassus Ave, San Francisco, CA 94143',
      phone: '+15550112',
      lat: 37.7631,
      lng: -122.4578,
      beds: 8,
    },
    {
      adminEmail: 'admin.stfrancis@lifelink.com',
      adminName: 'Dr. Angela Martinez',
      hospitalName: 'Saint Francis Memorial Hospital',
      address: '900 Hyde St, San Francisco, CA 94109',
      phone: '+15550113',
      lat: 37.7895,
      lng: -122.4152,
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

  // 3. Ambulance Drivers & Vehicles
  const driverData = [
    {
      email: 'driver.mike@lifelink.com',
      name: 'Michael Miller',
      phone: '+15550201',
      vehicle: 'AMB-101',
      type: AmbulanceType.BASIC_LIFE_SUPPORT,
      isAvailable: true,
      lat: 37.7749,
      lng: -122.4194, // Civic Center
      hospitalIndex: 0,
      verificationStatus: 'APPROVED',
      licenseNumber: 'DL-SF1001',
    },
    {
      email: 'driver.john@lifelink.com',
      name: 'John Fletcher',
      phone: '+15550202',
      vehicle: 'AMB-202',
      type: AmbulanceType.ADVANCED_LIFE_SUPPORT,
      isAvailable: true,
      lat: 37.7833,
      lng: -122.4167, // Tenderloin
      hospitalIndex: 1,
      verificationStatus: 'APPROVED',
      licenseNumber: 'DL-SF1002',
    },
    {
      email: 'driver.sam@lifelink.com',
      name: 'Samantha Cruz',
      phone: '+15550203',
      vehicle: 'AMB-303',
      type: AmbulanceType.OXYGEN_SUPPORT,
      isAvailable: true,
      lat: 37.7699,
      lng: -122.4468, // Haight-Ashbury
      hospitalIndex: 2,
      verificationStatus: 'APPROVED',
      licenseNumber: 'DL-SF1003',
    },
    {
      email: 'driver.danny@lifelink.com',
      name: 'Daniel Peterson',
      phone: '+15550204',
      vehicle: 'AMB-404',
      type: AmbulanceType.ADVANCED_LIFE_SUPPORT,
      isAvailable: false,
      lat: 37.7519,
      lng: -122.4433, // Twin Peaks (Offline)
      hospitalIndex: 0,
      verificationStatus: 'PENDING',
      licenseNumber: 'DL-SF1004',
    },
    {
      email: 'driver.lily@lifelink.com',
      name: 'Lily Evans',
      phone: '+15550205',
      vehicle: 'AMB-505',
      type: AmbulanceType.BASIC_LIFE_SUPPORT,
      isAvailable: false,
      lat: 37.7946,
      lng: -122.4074, // Chinatown (Offline)
      hospitalIndex: 1,
      verificationStatus: 'PENDING',
      licenseNumber: 'DL-SF1005',
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

    const ambulance = await prisma.ambulance.create({
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

  // 4. Patients & Patient Profiles
  const patientData = [
    {
      email: 'patient.john@gmail.com',
      name: 'John Doe',
      phone: '+15550301',
      bloodGroup: 'O+',
      allergies: 'Penicillin, Shellfish',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '+15550309',
      medicalNotes: 'Hypertension. Takes lisinopril 10mg daily.',
    },
    {
      email: 'patient.alice@gmail.com',
      name: 'Alice Smith',
      phone: '+15550302',
      bloodGroup: 'A-',
      allergies: 'Peanuts, Tree nuts',
      emergencyContactName: 'Robert Smith',
      emergencyContactPhone: '+15550308',
      medicalNotes: 'Asthmatic, carries albuterol inhaler.',
    },
    {
      email: 'patient.bob@gmail.com',
      name: 'Bob Johnson',
      phone: '+15550303',
      bloodGroup: 'B+',
      allergies: 'None',
      emergencyContactName: 'Carol Johnson',
      emergencyContactPhone: '+15550307',
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

  // 5. Past completed emergency logs
  console.log('Seeding past emergency logs...');
  const pastTrips = [
    {
      patientId: patients[0].id,
      driverId: drivers[0].id,
      hospitalId: hospitals[0].id,
      pickupLat: 37.7715,
      pickupLng: -122.4111,
      status: RequestStatus.COMPLETED,
      tripType: TripType.STANDARD,
      etaMinutes: 12,
      createdAt: new Date(Date.now() - 3 * 3600 * 1000), // 3 hours ago
      completedAt: new Date(Date.now() - 2.5 * 3600 * 1000),
    },
    {
      patientId: patients[1].id,
      driverId: drivers[1].id,
      hospitalId: hospitals[1].id,
      pickupLat: 37.7812,
      pickupLng: -122.4214,
      status: RequestStatus.COMPLETED,
      tripType: TripType.SOS,
      etaMinutes: 8,
      createdAt: new Date(Date.now() - 1.5 * 3600 * 1000), // 1.5 hours ago
      completedAt: new Date(Date.now() - 1.2 * 3600 * 1000),
    },
    {
      patientId: patients[2].id,
      driverId: drivers[2].id,
      hospitalId: hospitals[2].id,
      pickupLat: 37.7654,
      pickupLng: -122.4332,
      status: RequestStatus.COMPLETED,
      tripType: TripType.STANDARD,
      etaMinutes: 15,
      createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 mins ago
      completedAt: new Date(Date.now() - 20 * 60 * 1000),
    },
  ];

  for (const trip of pastTrips) {
    await prisma.emergencyRequest.create({
      data: trip,
    });
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
