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
import {
  uploadDoctorsExcel,
  uploadDriversExcel,
  uploadHospitalsExcel,
} from '../controllers/bulkUploadController';
import { excelUpload, handleUploadError } from '../middleware/uploadMiddleware';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';
import { loginUser } from '../controllers/authController';

const router = express.Router();

// 🔑 Hospital Login Alias
router.post('/login', loginUser);

// 👑 SuperAdmin Hospital Management Routes (Protected)
router.post('/hospitals', authenticateJWT, authorizeRoles('SUPER_ADMIN', 'ADMIN'), createHospital);
router.get('/hospitals', getAllHospitals);
router.get('/hospitals/:id', getHospitalById);
router.put('/hospitals/:id', authenticateJWT, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateHospital);
router.delete('/hospitals/:id', authenticateJWT, authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteHospital);
router.get('/superadmin/overview', authenticateJWT, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getSuperAdminOverview);
router.get('/overview', authenticateJWT, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getSuperAdminOverview);
router.get('/', getAllHospitals);
router.post('/', authenticateJWT, authorizeRoles('SUPER_ADMIN', 'ADMIN'), createHospital);

// 📁 SuperAdmin Bulk Upload Hospitals (Protected)
router.post(
  '/superadmin/upload/hospitals',
  authenticateJWT,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  excelUpload.single('file'),
  handleUploadError,
  uploadHospitalsExcel
);
router.post(
  '/hospitals/upload',
  authenticateJWT,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  excelUpload.single('file'),
  handleUploadError,
  uploadHospitalsExcel
);

// 🏥 Hospital Admin Routes
router.get('/hospital/profile', authenticateJWT, getHospitalProfile);
router.get('/hospital/doctors', authenticateJWT, getHospitalDoctors);
router.post('/hospital/doctors', authenticateJWT, addHospitalDoctor);
router.get('/hospital/drivers', authenticateJWT, getHospitalDrivers);
router.post('/hospital/drivers', authenticateJWT, addHospitalDriver);
router.get('/hospital/appointments', authenticateJWT, getHospitalAppointments);
router.get('/hospital/ambulance-bookings', authenticateJWT, getHospitalAmbulanceBookings);
router.get('/hospital/dashboard', authenticateJWT, getHospitalDashboard);

// 📁 Hospital Admin Bulk Upload Routes
router.post(
  '/hospital/upload/doctors',
  authenticateJWT,
  excelUpload.single('file'),
  handleUploadError,
  uploadDoctorsExcel
);
router.post(
  '/hospital/upload/drivers',
  authenticateJWT,
  excelUpload.single('file'),
  handleUploadError,
  uploadDriversExcel
);
router.post(
  '/upload/doctors',
  authenticateJWT,
  excelUpload.single('file'),
  handleUploadError,
  uploadDoctorsExcel
);
router.post(
  '/upload/drivers',
  authenticateJWT,
  excelUpload.single('file'),
  handleUploadError,
  uploadDriversExcel
);

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
