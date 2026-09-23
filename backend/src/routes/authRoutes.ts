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
import { authLimiter } from '../middleware/rateLimiter';

const authRouter = express.Router();

// 🔐 Authentication & OAuth with Anti-Brute Force Limiting
authRouter.post('/register', authLimiter, registerUser);
authRouter.post('/login', authLimiter, loginUser);
authRouter.post('/google-login', authLimiter, googleAuthLogin);
authRouter.post('/google', authLimiter, googleAuth);
authRouter.post('/logout', logoutUser);

// 🔄 Token Refresh & Rotation
authRouter.post('/refresh', refreshToken);
authRouter.post('/refresh-token', refreshToken);
authRouter.get('/refresh', refreshToken);

// 📧 Email Verification
authRouter.get('/verify-email', verifyEmail);
authRouter.post('/verify-email', verifyEmail);
authRouter.post('/resend-verification', authLimiter, resendVerification);

// 🔑 Forgot & Reset Password
authRouter.post('/forgot-password', authLimiter, forgotPassword);
authRouter.post('/reset-password', authLimiter, resetPassword);

// 👤 Profile (Protected by JWT middleware)
authRouter.get('/profile', authenticate, getProfile);

export default authRouter;
