import express from 'express';
import {
  doctorList,
  loginDoctor,
  appointmentsDoctor,
  appointmentComplete,
  appointmentCancel,
  doctorDashboard,
  doctorProfile,
  updateDoctorProfile,
  changeAvailablity,
  toggleAvailability,
} from '../controllers/doctorController';
import { authDoctor } from '../middleware/authDoctor';

const doctorRouter = express.Router();

// Public doctor directory
doctorRouter.get('/list', doctorList);
doctorRouter.get('/', doctorList);

// Doctor auth & panel routes
doctorRouter.post('/login', loginDoctor);
doctorRouter.get('/appointments', authDoctor, appointmentsDoctor);
doctorRouter.post('/appointments', authDoctor, appointmentsDoctor);
doctorRouter.post('/complete-appointment', authDoctor, appointmentComplete);
doctorRouter.post('/cancel-appointment', authDoctor, appointmentCancel);
doctorRouter.get('/dashboard', authDoctor, doctorDashboard);
doctorRouter.post('/dashboard', authDoctor, doctorDashboard);
doctorRouter.get('/profile', authDoctor, doctorProfile);
doctorRouter.post('/profile', authDoctor, doctorProfile);
doctorRouter.post('/update-profile', authDoctor, updateDoctorProfile);
doctorRouter.post('/change-availability', authDoctor, changeAvailablity);
doctorRouter.post('/toggle-availability', authDoctor, toggleAvailability);

export default doctorRouter;
