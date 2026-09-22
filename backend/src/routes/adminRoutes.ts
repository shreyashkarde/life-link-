import { Router } from 'express';
import {
  getHospitalAdminStats,
  getSuperAdminStats,
  getAllUsers,
  toggleUserStatus,
  saveHospital,
} from '../controllers/adminController';
import { authenticateJWT } from '../middleware/auth';
import { authorizeRoles } from '../middleware/roleAuth';

const router = Router();

router.use(authenticateJWT);

// Hospital Admin
router.get(
  '/hospital/stats',
  authorizeRoles('ADMIN_HOSPITAL', 'SUPER_ADMIN'),
  getHospitalAdminStats
);

// Super Admin
router.get('/super/stats', authorizeRoles('SUPER_ADMIN'), getSuperAdminStats);
router.get('/users', authorizeRoles('SUPER_ADMIN'), getAllUsers);
router.put('/users/:id/toggle-status', authorizeRoles('SUPER_ADMIN'), toggleUserStatus);
router.post('/hospital', authorizeRoles('SUPER_ADMIN'), saveHospital);
router.put('/hospital/:id', authorizeRoles('SUPER_ADMIN'), saveHospital);

export default router;
