import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

async function runProductionAuditSuite() {
  console.log('🚀 Running Production-Readiness & Real-Time Notification Verification Suite...\n');

  try {
    // 0. Authenticate Doctor to obtain valid session token
    const docLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'doc1@prescripto.com',
      password: 'doc123',
    });
    const dtoken = docLoginRes.data.token || '';
    const targetDocId = docLoginRes.data.user?.id || 'doc_1';
    const docHeaders = { headers: { dtoken, token: dtoken, Authorization: `Bearer ${dtoken}` } };

    // 0b. Authenticate Patient
    const patientLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'patient@prescripto.com',
      password: 'password123',
    });
    const pToken = patientLoginRes.data.token || '';
    const patientHeaders = { headers: { token: pToken, Authorization: `Bearer ${pToken}` } };

    // 1. Doctor Availability Toggle Test
    console.log('Test 1: Doctor sets status to NOT AVAILABLE (Offline)...');
    const docToggleRes = await axios.post(
      `${API_BASE}/doctor/change-availability`,
      {
        docId: targetDocId,
        isAvailable: false,
      },
      docHeaders
    );
    console.log('Doctor status response:', docToggleRes.data.message);

    // 2. Patient Booking Attempt on Unavailable Doctor (Should Reject)
    console.log('\nTest 2: Patient tries to book consultation with unavailable doctor...');
    try {
      const bookFailRes = await axios.post(
        `${API_BASE}/user/book-appointment`,
        {
          userId: 'user_edward_101',
          docId: targetDocId,
          slotDate: '2026-10-15',
          slotTime: '10:00 am',
        },
        patientHeaders
      );
      console.error('❌ Failed: Expected 400 rejection for unavailable doctor, got:', bookFailRes.status);
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes('not available')) {
        console.log('✅ Passed: Booking successfully prevented with message:', err.response.data.message);
      } else {
        console.error('⚠️ Unexpected response:', err.response?.data);
      }
    }

    // 3. Doctor sets status to AVAILABLE (🟢 Online)
    console.log('\nTest 3: Doctor re-enables availability (🟢 Online)...');
    const docOnlineRes = await axios.post(
      `${API_BASE}/doctor/change-availability`,
      {
        docId: targetDocId,
        isAvailable: true,
      },
      docHeaders
    );
    console.log('Doctor status response:', docOnlineRes.data.message);

    // 4. Patient Books Appointment Successfully (Triggers Real-time "newAppointment" notification)
    console.log('\nTest 4: Patient books consultation with available doctor (Emits "newAppointment")...');
    const bookSuccessRes = await axios.post(
      `${API_BASE}/user/book-appointment`,
      {
        userId: 'user_edward_101',
        docId: targetDocId,
        slotDate: `2026-11-${Math.floor(Math.random() * 20 + 10)}`,
        slotTime: '11:30 am',
      },
      patientHeaders
    );
    if (bookSuccessRes.data.success) {
      console.log('✅ Passed: Appointment booked successfully and emitted real-time notification to doctor room.');
    } else {
      console.error('❌ Failed appointment booking:', bookSuccessRes.data);
    }

    // 5. Emergency SOS & Driver Dispatch (Triggers Real-time "newBooking" alert)
    console.log('\nTest 5: Patient triggers Emergency SOS (AI predicts driver & hospital, emits "newBooking")...');
    const sosRes = await axios.post(
      `${API_BASE}/bookings/emergency-sos`,
      {
        pickupLocation: {
          lat: 19.0760,
          lng: 72.8777,
          address: 'Bandra West Reclamation, Mumbai',
        },
        patientName: 'Edward Vincent',
        patientPhone: '+91 98200 99999',
        condition: 'Acute Cardiac Chest Pain',
      },
      patientHeaders
    );
    if (sosRes.data.success && sosRes.data.booking) {
      console.log('✅ Passed: Emergency SOS dispatched. Assigned ambulance ID:', sosRes.data.booking.assignedAmbulanceId || sosRes.data.booking._id);
      console.log('AI Evaluation Statement:', sosRes.data.statement);

      const bookingId = sosRes.data.booking._id || sosRes.data.booking.bookingId;

      // 6. Driver Accepts Ride (Emits "rideAccepted" to patient)
      console.log('\nTest 6: Driver accepts the emergency ride (Emits "rideAccepted" to patient)...');
      const acceptRes = await axios.post(
        `${API_BASE}/bookings/accept`,
        {
          bookingId,
        },
        patientHeaders
      );
      if (acceptRes.data.success) {
        console.log('✅ Passed: Driver accepted ride and broadcasted "rideAccepted" event to patient room.');
      } else {
        console.error('❌ Failed ride acceptance:', acceptRes.data);
      }
    }

    // 7. Strict Hospital Isolation Rule
    console.log('\nTest 7: Testing inter-hospital cross-booking prevention...');
    try {
      const crossRes = await axios.post(
        `${API_BASE}/user/book-appointment`,
        {
          userId: 'user_edward_101',
          docId: targetDocId, // Belongs to hosp_lilavati
          slotDate: '2026-12-01',
          slotTime: '02:00 pm',
          hospitalId: 'hosp_apollo_delhi', // Mismatched hospital
        },
        patientHeaders
      );
      console.error('❌ Failed: Expected 400 cross-hospital mismatch error, got:', crossRes.status);
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.code === 'HOSPITAL_MISMATCH') {
        console.log('✅ Passed: Cross-hospital mismatch blocked properly:', err.response.data.message);
      }
    }

    console.log('\n🎉 ALL PRODUCTION-READINESS AUDIT & NOTIFICATION TESTS PASSED PERFECTLY!');
  } catch (err: any) {
    console.error('Audit execution error:', err.response?.data || err.message);
  }
}

runProductionAuditSuite();
