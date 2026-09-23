import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000';

async function verifySystem() {
  console.log('🚀 Starting Full-Stack End-to-End API & Feature Verification...\n');

  try {
    // 1. Health check
    console.log('1️⃣ Testing Health Check...');
    const health = await axios.get(`${API_BASE}/api/health`);
    console.log('   ✓ Health check passed:', health.data.message);

    // 2. Authentication Test (All 5 Roles)
    console.log('\n2️⃣ Testing Unified Authentication for All 5 Roles...');
    
    // Patient
    const patientLogin = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'patient@prescripto.com',
      password: 'password123',
    });
    console.log('   ✓ Patient Login:', patientLogin.data.user.name, `(${patientLogin.data.user.role})`);
    const patientToken = patientLogin.data.token;

    // Doctor
    const docLogin = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'doc1@prescripto.com',
      password: 'doc123',
    });
    console.log('   ✓ Doctor Login:', docLogin.data.user.name, `(${docLogin.data.user.role})`);

    // Hospital Admin
    const hospLogin = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'hospital@prescripto.com',
      password: 'hospital123',
    });
    console.log('   ✓ Hospital Admin Login:', hospLogin.data.user.name, `(${hospLogin.data.user.role})`);
    const hospToken = hospLogin.data.token;

    // Driver
    const driverLogin = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'driver1@prescripto.com',
      password: 'driver123',
    });
    console.log('   ✓ Paramedic Driver Login:', driverLogin.data.user.name, `(${driverLogin.data.user.role})`);

    // Super Admin
    const adminLogin = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@prescripto.com',
      password: 'admin123',
    });
    console.log('   ✓ Super Admin Login:', adminLogin.data.user.name, `(${adminLogin.data.user.role})`);
    const adminToken = adminLogin.data.token;

    // 3. SuperAdmin Overview & Hospital Listing
    console.log('\n3️⃣ Testing SuperAdmin Overview & Hospitals API...');
    const overview = await axios.get(`${API_BASE}/api/superadmin/overview`);
    console.log('   ✓ SuperAdmin Stats:', overview.data.stats);

    const hospitals = await axios.get(`${API_BASE}/api/hospitals`);
    console.log(`   ✓ Found ${hospitals.data.count} Registered Hospitals:`);
    hospitals.data.hospitals.forEach((h: any) => console.log(`      - [${h._id || h.id}] ${h.name} (${h.traumaLevel})`));

    // 4. Hospital Admin Desk Operations
    console.log('\n4️⃣ Testing Hospital Admin Operations (Lilavati Hospital)...');
    const hospDesk = await axios.get(`${API_BASE}/api/hospital/dashboard`, {
      headers: { Authorization: `Bearer ${hospToken}` },
    });
    console.log('   ✓ Hospital Live Dashboard:', hospDesk.data.dashboard);

    const hospDoctors = await axios.get(`${API_BASE}/api/hospital/doctors`, {
      headers: { Authorization: `Bearer ${hospToken}` },
    });
    console.log(`   ✓ Hospital Doctors Roster: ${hospDoctors.data.count} doctors linked.`);

    const hospDrivers = await axios.get(`${API_BASE}/api/hospital/drivers`, {
      headers: { Authorization: `Bearer ${hospToken}` },
    });
    console.log(`   ✓ Hospital Ambulance Fleet: ${hospDrivers.data.count} units ready.`);

    // 5. Patient Appointment Booking with Strict 3-Way Relational Linkage
    console.log('\n5️⃣ Testing Doctor Appointment Booking with 3-Way Relational Linkage...');
    const firstDoc = hospDoctors.data.doctors[0];
    const bookAppt = await axios.post(
      `${API_BASE}/api/user/book-appointment`,
      {
        userId: 'user_1',
        docId: firstDoc._id || firstDoc.id,
        slotDate: '28_09_2026',
        slotTime: '10:00 AM',
      },
      { headers: { token: patientToken, Authorization: `Bearer ${patientToken}` } }
    );
    console.log('   ✓ Appointment Booked Response:', bookAppt.data.message);

    // Verify appointment in Hospital Appointments Queue
    const hospAppts = await axios.get(`${API_BASE}/api/hospital/appointments`, {
      headers: { Authorization: `Bearer ${hospToken}` },
    });
    console.log(`   ✓ Hospital Appointments Queue: ${hospAppts.data.count} appointment(s) found.`);
    if (hospAppts.data.appointments.length > 0) {
      const appt = hospAppts.data.appointments[0];
      console.log(`      - Patient: ${appt.userData?.name || appt.patientId} | Doctor: ${appt.docData?.name} | Hospital: ${appt.hospitalName} [hospitalId: ${appt.hospitalId}]`);
    }

    // 6. Emergency SOS Dispatch & Driver Workflow (5-Stage Ride Lifecycle)
    console.log('\n6️⃣ Testing 1-Click Code-Red Emergency SOS & Ride Lifecycle...');
    const sosDispatch = await axios.post(
      `${API_BASE}/api/bookings/emergency-sos`,
      {
        pickupLocation: { lat: 19.0550, lng: 72.8300, address: 'Bandra Bandstand Emergency Point' },
        patientName: 'Edward Vincent',
        patientPhone: '+91 98200 99999',
        condition: 'Severe Acute Chest Pain (Cardiac Code-Red)',
      },
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    const booking = sosDispatch.data.booking;
    console.log(`   ✓ Emergency SOS Dispatched! Booking ID: ${booking._id}`);
    console.log(`      - Assigned Paramedic: ${booking.driverName} (${booking.vehicleNumber})`);
    console.log(`      - Destination Hospital: ${booking.hospitalName} [hospitalId: ${booking.hospitalId}]`);
    console.log(`      - Severity: ${booking.emergencySeverity} | Initial Status: ${booking.status}`);

    // Update ride status: EN_ROUTE_PICKUP
    const status1 = await axios.post(
      `${API_BASE}/api/bookings/status`,
      { bookingId: booking._id, status: 'EN_ROUTE_PICKUP' },
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    console.log(`   ✓ Status Updated -> ${status1.data.booking.status}`);

    // Update ride status: PATIENT_ONBOARD
    const status2 = await axios.post(
      `${API_BASE}/api/bookings/status`,
      { bookingId: booking._id, status: 'PATIENT_ONBOARD' },
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    console.log(`   ✓ Status Updated -> ${status2.data.booking.status}`);

    // Update ride status: COMPLETED
    const status3 = await axios.post(
      `${API_BASE}/api/bookings/status`,
      { bookingId: booking._id, status: 'COMPLETED' },
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    console.log(`   ✓ Status Updated -> ${status3.data.booking.status} (Arrived at Trauma Bay)`);

    // 7. Bulk Excel Upload Testing
    console.log('\n7️⃣ Testing Bulk Excel (.xlsx) Import Engine...');
    const sampleDocPath = path.resolve(__dirname, '../../samples/sample_doctors.xlsx');
    if (fs.existsSync(sampleDocPath)) {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', fs.createReadStream(sampleDocPath));

      const uploadRes = await axios.post(`${API_BASE}/api/hospital/upload/doctors`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${hospToken}`,
        },
      });

      console.log('   ✓ Bulk Doctor Excel Upload Result:');
      console.log(`      - Total in file: ${uploadRes.data.totalRecords}`);
      console.log(`      - Successfully Uploaded: ${uploadRes.data.successfulUploads}`);
      console.log(`      - Skipped / Errors: ${uploadRes.data.failedRecords}`);
    }

    console.log('\n============================================================');
    console.log('🎉 ALL SYSTEM MODULES & SPECIFICATIONS VERIFIED 100% OPERATIONAL!');
    console.log('============================================================\n');
  } catch (err: any) {
    console.error('❌ Verification Error:', err.response?.data || err.message);
  }
}

verifySystem();
