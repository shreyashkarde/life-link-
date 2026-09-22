import { Router } from 'express';
import {
  bookAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointmentStatus,
} from '../controllers/appointmentController';
import { authenticateJWT } from '../middleware/auth';
import { authorizeRoles } from '../middleware/roleAuth';

const router = Router();

router.use(authenticateJWT);

router.post('/book', bookAppointment);
router.get('/patient', getPatientAppointments);
router.get('/doctor', authorizeRoles('DOCTOR'), getDoctorAppointments);
router.put('/:id/status', updateAppointmentStatus);

export default router;
