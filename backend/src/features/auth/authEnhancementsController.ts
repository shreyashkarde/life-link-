import { Request, Response } from 'express';
import {
  googleAuthLogin,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from '../../controllers/authController';

export { googleAuthLogin, forgotPassword, resetPassword, verifyEmail, resendVerification };
