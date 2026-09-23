import express from 'express';
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  paymentComplete,
} from '../controllers/userController';
import { authUser } from '../middleware/authUser';

const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.get('/get-profile', authUser, getProfile);
userRouter.post('/get-profile', authUser, getProfile);
userRouter.post('/update-profile', authUser, updateProfile);
userRouter.post('/book-appointment', authUser, bookAppointment);
userRouter.get('/appointments', authUser, listAppointment);
userRouter.post('/appointments', authUser, listAppointment);
userRouter.post('/cancel-appointment', authUser, cancelAppointment);
userRouter.post('/payment-complete', authUser, paymentComplete);
userRouter.post('/payment-razorpay', authUser, paymentComplete);
userRouter.post('/payment-stripe', authUser, paymentComplete);

export default userRouter;
