import express from 'express';
import {
  createAmbulanceBooking,
  triggerEmergencySOS,
  acceptBooking,
  rejectBooking,
  updateBookingStatus,
  getPatientBookings,
  getDriverTrips,
  getBookingById,
} from '../controllers/bookingController';
import { authenticate } from '../middleware/auth';

const bookingRouter = express.Router();

bookingRouter.post('/create', authenticate, createAmbulanceBooking);
bookingRouter.post('/emergency-sos', authenticate, triggerEmergencySOS);
bookingRouter.post('/accept', authenticate, acceptBooking);
bookingRouter.post('/reject', authenticate, rejectBooking);
bookingRouter.post('/status', authenticate, updateBookingStatus);
bookingRouter.get('/my-bookings', authenticate, getPatientBookings);
bookingRouter.get('/driver-trips', authenticate, getDriverTrips);
bookingRouter.get('/:bookingId', authenticate, getBookingById);

export default bookingRouter;
