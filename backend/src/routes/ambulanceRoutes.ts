import { Router } from 'express';
import {
  getNearbyAmbulances,
  getDriverProfile,
  toggleDriverStatus,
  updateLiveLocation,
} from '../controllers/ambulanceController';
import { authenticateJWT } from '../middleware/auth';
import { authorizeRoles } from '../middleware/roleAuth';

const router = Router();

// Public search for nearest ambulances
router.get('/nearby', getNearbyAmbulances);

// Driver Protected Routes
router.get('/driver/profile', authenticateJWT, authorizeRoles('DRIVER'), getDriverProfile);
router.put('/driver/status', authenticateJWT, authorizeRoles('DRIVER'), toggleDriverStatus);
router.put('/driver/location', authenticateJWT, authorizeRoles('DRIVER'), updateLiveLocation);

export default router;
