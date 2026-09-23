import express from 'express';
import { googleAuthLogin, forgotPassword, resetPassword } from './authEnhancementsController';

const authEnhancementsRouter = express.Router();

// POST /api/auth/google-login
authEnhancementsRouter.post('/google-login', googleAuthLogin);

// POST /api/auth/forgot-password
authEnhancementsRouter.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password
authEnhancementsRouter.post('/reset-password', resetPassword);

export default authEnhancementsRouter;
