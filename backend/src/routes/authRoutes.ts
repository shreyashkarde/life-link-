import express from 'express';
import {
  registerUser,
  loginUser,
  googleAuthLogin,
  googleAuth,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getProfile,
  logoutUser,
  refreshToken,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const authRouter = express.Router();

// 🔐 Authentication & OAuth
authRouter.post('/register', registerUser);
authRouter.post('/login', loginUser);
authRouter.post('/google-login', googleAuthLogin);
authRouter.post('/google', googleAuth);
authRouter.post('/logout', logoutUser);

// 🔄 Token Refresh & Rotation
authRouter.post('/refresh', refreshToken);
authRouter.post('/refresh-token', refreshToken);
authRouter.get('/refresh', refreshToken);

// 📧 Email Verification
authRouter.get('/verify-email', verifyEmail);
authRouter.post('/verify-email', verifyEmail);
authRouter.post('/resend-verification', resendVerification);

// 🔑 Forgot & Reset Password
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);

// 👤 Profile (Protected by JWT middleware)
authRouter.get('/profile', authenticate, getProfile);

export default authRouter;
