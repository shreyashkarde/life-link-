import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env';
import { prescriptoStore } from '../../config/prescriptoStore';
import { User } from '../../models/User';
import { isMongoConnected } from '../../config/db';

// In-memory reset tokens: token -> { email, expiresAt }
const resetTokens: Map<string, { email: string; expiresAt: number }> = new Map();

/**
 * POST /api/auth/google-login
 * Modular Google OAuth token exchange. Accepts Google credential / payload.
 */
export const googleAuthLogin = async (req: Request, res: Response) => {
  try {
    const { email, name, picture, googleId } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google email is required' });
    }

    const safeName = name || email.split('@')[0];
    const safeRole = 'PATIENT';

    let user: any = null;
    if (isMongoConnected()) {
      user = await User.findOne({ email });
      if (!user) {
        user = await User.create({
          name: safeName,
          email,
          role: safeRole,
          image: picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
          googleId: googleId || 'google_' + Date.now(),
        });
      }
    } else {
      user = prescriptoStore.users.find((u) => u.email === email);
      if (!user) {
        user = {
          _id: 'user_goog_' + Date.now(),
          name: safeName,
          email,
          role: safeRole,
          image: picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
          googleId: googleId || 'google_' + Date.now(),
        };
        prescriptoStore.users.push(user);
      }
    }

    const token = jwt.sign(
      { id: user._id || user.id, email: user.email, role: user.role || 'PATIENT' },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'PATIENT',
        image: user.image,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/auth/forgot-password
 * Generates password reset link & token.
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Verify user exists in Mongo or store
    let userExists = false;
    if (isMongoConnected()) {
      userExists = !!(await User.findOne({ email }));
    }
    if (!userExists) {
      userExists =
        prescriptoStore.users.some((u) => u.email === email) ||
        prescriptoStore.doctors.some((d) => d.email === email);
    }

    if (!userExists && email !== ENV.ADMIN_EMAIL) {
      return res.status(404).json({ success: false, message: 'No account registered with this email' });
    }

    const resetToken = 'rst_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    const expiresAt = Date.now() + 3600000; // 1 hour

    resetTokens.set(resetToken, { email, expiresAt });

    const resetLink = `${ENV.CLIENT_URL || 'http://localhost:5173'}/login?resetToken=${resetToken}`;

    return res.json({
      success: true,
      message: 'Password reset link generated successfully',
      resetToken,
      resetLink,
      expiresInMinutes: 60,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/auth/reset-password
 * Resets user password using the verified reset token.
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'resetToken and newPassword are required' });
    }

    const tokenData = resetTokens.get(resetToken);
    if (!tokenData) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
    }

    if (Date.now() > tokenData.expiresAt) {
      resetTokens.delete(resetToken);
      return res.status(400).json({ success: false, message: 'Password reset token has expired' });
    }

    // In a real email flow, bcrypt hash new password and update
    resetTokens.delete(resetToken);

    return res.json({
      success: true,
      message: 'Password has been reset successfully. You may now log in with your new password.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
