import { Router } from 'express';
import {
  getAllDoctors,
  getDoctorById,
  updateDoctorProfile,
  updateDoctorSlots,
  getDoctorDashboardStats,
} from '../controllers/doctorController';
import { authenticateJWT } from '../middleware/auth';
import { authorizeRoles } from '../middleware/roleAuth';

const router = Router();

// Public doctor discovery
router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);

// Doctor Dashboard protected actions
router.put('/profile/update', authenticateJWT, authorizeRoles('DOCTOR'), updateDoctorProfile);
router.put('/slots/update', authenticateJWT, authorizeRoles('DOCTOR'), updateDoctorSlots);
router.get('/dashboard/stats', authenticateJWT, authorizeRoles('DOCTOR'), getDoctorDashboardStats);

export default router;
