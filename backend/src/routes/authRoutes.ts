import express from 'express';
import { registerUser, loginUser, googleAuth, getProfile, logoutUser } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const authRouter = express.Router();

authRouter.post('/register', registerUser);
authRouter.post('/login', loginUser);
authRouter.post('/google', googleAuth);
authRouter.post('/logout', logoutUser);
authRouter.get('/profile', authenticate, getProfile);

export default authRouter;

