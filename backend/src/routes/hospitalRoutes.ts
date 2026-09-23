import express from 'express';
import {
  createHospital,
  getAllHospitals,
  getHospitalById,
  updateHospital,
  deleteHospital,
  getSuperAdminOverview,
  getHospitalProfile,
  getHospitalDoctors,
  addHospitalDoctor,
  getHospitalDrivers,
  addHospitalDriver,
  getHospitalAppointments,
  getHospitalAmbulanceBookings,
  getHospitalDashboard,
} from '../controllers/hospitalController';
import { authenticateJWT } from '../middleware/auth';

const router = express.Router();

// 👑 SuperAdmin Hospital Management Routes
router.post('/hospitals', createHospital);
router.get('/hospitals', getAllHospitals);
router.get('/hospitals/:id', getHospitalById);
router.put('/hospitals/:id', updateHospital);
router.delete('/hospitals/:id', deleteHospital);
router.get('/superadmin/overview', getSuperAdminOverview);

// 🏥 Hospital Admin Routes
router.get('/hospital/profile', authenticateJWT, getHospitalProfile);
router.get('/hospital/doctors', authenticateJWT, getHospitalDoctors);
router.post('/hospital/doctors', authenticateJWT, addHospitalDoctor);
router.get('/hospital/drivers', authenticateJWT, getHospitalDrivers);
router.post('/hospital/drivers', authenticateJWT, addHospitalDriver);
router.get('/hospital/appointments', authenticateJWT, getHospitalAppointments);
router.get('/hospital/ambulance-bookings', authenticateJWT, getHospitalAmbulanceBookings);
router.get('/hospital/dashboard', authenticateJWT, getHospitalDashboard);

// Support both path prefixes
router.get('/profile', authenticateJWT, getHospitalProfile);
router.get('/doctors', authenticateJWT, getHospitalDoctors);
router.post('/doctors', authenticateJWT, addHospitalDoctor);
router.get('/drivers', authenticateJWT, getHospitalDrivers);
router.post('/drivers', authenticateJWT, addHospitalDriver);
router.get('/appointments', authenticateJWT, getHospitalAppointments);
router.get('/ambulance-bookings', authenticateJWT, getHospitalAmbulanceBookings);
router.get('/dashboard', authenticateJWT, getHospitalDashboard);

export default router;
