import { Router } from 'express';
import {
  createBooking,
  createSOSBooking,
  driverResponseBooking,
  updateBookingStatus,
  getBookingById,
  getPatientBookings,
  getDriverBookings,
} from '../controllers/bookingController';
import { authenticateJWT } from '../middleware/auth';
import { authorizeRoles } from '../middleware/roleAuth';

const router = Router();

router.use(authenticateJWT);

router.post('/create', createBooking);
router.post('/emergency-sos', createSOSBooking);
router.get('/patient/history', getPatientBookings);
router.get('/driver/history', authorizeRoles('DRIVER'), getDriverBookings);
router.get('/:id', getBookingById);
router.put('/:id/driver-response', authorizeRoles('DRIVER'), driverResponseBooking);
router.put('/:id/status', updateBookingStatus);

export default router;
