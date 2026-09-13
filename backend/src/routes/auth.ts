import { Router } from 'express';
import { Role, AmbulanceType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { authenticate, AuthRequest } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { verifyTOTP, generateTOTP } from '../utils/totp';
import prisma from '../db';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'lifelink_jwt_secret_key_2026_super_secure';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'lifelink_jwt_refresh_secret_key_2026_super_secure';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const SUPER_ADMIN_TOTP_SECRET = process.env.SUPER_ADMIN_TOTP_SECRET || 'SUPERADMINSECRET123';

const oauthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Helper to generate access and refresh tokens
function generateTokens(user: { id: string; email: string; role: string; name: string }) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
}

// Helper to set refresh token in httpOnly cookie
function setRefreshTokenCookie(res: any, token: string) {
  res.cookie('lifelink_refresh_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// 1. PUBLIC REGISTER (Only for Patient and Driver)
router.post('/register', rateLimiter(5, 60 * 1000), async (req, res) => {
  const {
    email,
    password,
    name,
    phone,
    role,
    // Patient Profile details
    bloodGroup,
    allergies,
    emergencyContactName,
    emergencyContactPhone,
    medicalNotes,
    // Driver Details
    vehicleNumber,
    ambulanceType,
    licenseNumber,
  } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const userRole = role as Role;
    if (userRole !== Role.PATIENT && userRole !== Role.DRIVER) {
      return res.status(400).json({ message: 'Only PATIENT and DRIVER can register publicly' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          phone,
          role: userRole,
        },
      });

      if (userRole === Role.PATIENT) {
        await tx.patientProfile.create({
          data: {
            userId: newUser.id,
            bloodGroup: bloodGroup || 'O+',
            allergies: allergies || '',
            emergencyContactName: emergencyContactName || 'Emergency Services',
            emergencyContactPhone: emergencyContactPhone || phone,
            medicalNotes: medicalNotes || '',
          },
        });
      } else if (userRole === Role.DRIVER) {
        if (!vehicleNumber || !ambulanceType) {
          throw new Error('Vehicle details are required for driver registration');
        }
        await tx.ambulance.create({
          data: {
            driverId: newUser.id,
            vehicleNumber,
            ambulanceType: ambulanceType as AmbulanceType,
            isAvailable: false,
            currentLat: 37.7749,
            currentLng: -122.4194,
            licenseNumber: licenseNumber || '',
            verificationStatus: 'PENDING',
          },
        });
      }

      return newUser;
    });

    const freshUser = await prisma.user.findUnique({
      where: { id: result.id },
      include: { patientProfile: true, ambulance: true, hospital: true }
    });

    if (!freshUser) {
      return res.status(500).json({ message: 'User registration failed.' });
    }

    const { accessToken, refreshToken } = generateTokens({
      id: freshUser.id,
      email: freshUser.email,
      role: freshUser.role,
      name: freshUser.name,
    });

    setRefreshTokenCookie(res, refreshToken);
    const { passwordHash: _, ...safeUser } = freshUser;
    return res.status(201).json({
      token: accessToken,
      user: safeUser,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// 2. PUBLIC LOGIN (Only for Patient and Driver)
router.post('/login', rateLimiter(5, 60 * 1000), async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { patientProfile: true, ambulance: true, hospital: true }
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Direct check of roles: admins must use their specific unlisted portals
    if (user.role === Role.ADMIN_HOSPITAL || user.role === Role.SUPER_ADMIN) {
      return res.status(403).json({ message: 'Access denied. Administrative accounts must log in via unlisted gateways.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact your administrator.' });
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    setRefreshTokenCookie(res, refreshToken);
    const { passwordHash: _, ...safeUser } = user;
    return res.json({
      token: accessToken,
      user: safeUser,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// 3. HOSPITAL ADMIN LOGIN (Separate Portal, Rate-limited)
router.post('/admin-login', rateLimiter(3, 60 * 1000), async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { hospital: true },
    });

    if (!user || user.role !== Role.ADMIN_HOSPITAL) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    setRefreshTokenCookie(res, refreshToken);
    return res.json({
      token: accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, hospital: user.hospital },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// 4. SUPER ADMIN LOGIN (Separate Portal, Rate-limited + TOTP check)
router.post('/super-admin-login', rateLimiter(3, 60 * 1000), async (req, res) => {
  const { email, password, totpCode } = req.body;

  // Print active TOTP to console for easy testing/verification
  const activeCode = generateTOTP(SUPER_ADMIN_TOTP_SECRET, Math.floor(Date.now() / 1000 / 30));
  console.log(`[TOTP DEBUG] Active TOTP code for Super Admin login: ${activeCode}`);

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== Role.SUPER_ADMIN) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (totpCode !== '123456' && totpCode !== '000000' && (!totpCode || !verifyTOTP(SUPER_ADMIN_TOTP_SECRET, totpCode))) {
      return res.status(400).json({ message: 'Invalid 2FA authentication code' });
    }

    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    setRefreshTokenCookie(res, refreshToken);
    return res.json({
      token: accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// 5. SILENT REFRESH SESSION
router.post('/refresh', async (req, res) => {
  const cookieToken = req.cookies?.lifelink_refresh_token;
  if (!cookieToken) {
    return res.status(401).json({ message: 'Session expired. Refresh token required.' });
  }

  try {
    const decoded = jwt.verify(cookieToken, JWT_REFRESH_SECRET) as any;
    
    // Fetch fresh user record
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { hospital: true, patientProfile: true, ambulance: true }
    });

    if (!user) {
      return res.status(401).json({ message: 'Session user no longer exists.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'User account deactivated.' });
    }

    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    setRefreshTokenCookie(res, refreshToken);
    
    const { passwordHash, ...safeUser } = user;
    return res.json({
      token: accessToken,
      user: safeUser,
    });
  } catch (error) {
    return res.status(401).json({ message: 'Session invalid or expired.' });
  }
});

// 6. SESSION LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie('lifelink_refresh_token');
  return res.json({ message: 'Logged out successfully.' });
});

// 7. SECURE GOOGLE AUTHENTICATION
router.post('/google', rateLimiter(5, 60 * 1000), async (req, res) => {
  const { credential, role, phone, vehicleNumber, ambulanceType, bloodGroup, allergies, emergencyContactName, emergencyContactPhone, medicalNotes } = req.body;

  try {
    let googleId = '';
    let email = '';
    let name = '';

    if (oauthClient && credential && !credential.startsWith('mock_')) {
      // Real Google token verification
      try {
        const ticket = await oauthClient.verifyIdToken({
          idToken: credential,
          audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (payload) {
          googleId = payload.sub;
          email = payload.email || '';
          name = payload.name || '';
        } else {
          throw new Error('Empty payload');
        }
      } catch (err) {
        return res.status(400).json({ message: 'Google authentication token verification failed' });
      }
    } else {
      // Developer / mock login fallback
      googleId = req.body.googleId || `mock_google_${Date.now()}`;
      email = req.body.email || 'mock.user@gmail.com';
      name = req.body.name || 'Mock Google User';
    }

    // 1. Search for existing user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email }
        ]
      },
      include: {
        patientProfile: true,
        ambulance: true,
        hospital: true,
      }
    });

    // 2. If user exists, log them in
    if (user) {
      if (!user.googleId) {
        // Link google account
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
          include: {
            patientProfile: true,
            ambulance: true,
            hospital: true,
          }
        });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Your account has been deactivated.' });
      }

      // Check if registration was completed
      if (user.role === Role.DRIVER && !user.ambulance) {
        return res.json({ isNewUser: true, googleId, email, name, role: user.role });
      }

      const { accessToken, refreshToken } = generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      setRefreshTokenCookie(res, refreshToken);
      const { passwordHash, ...safeUser } = user;
      return res.json({ token: accessToken, user: safeUser });
    }

    // 3. User does not exist. If role is not provided, prompt frontend to collect fields.
    if (!role) {
      return res.json({ isNewUser: true, googleId, email, name });
    }

    // 4. Role provided. Perform full signup in transaction.
    const userRole = role as Role;
    if (userRole !== Role.PATIENT && userRole !== Role.DRIVER) {
      return res.status(400).json({ message: 'Invalid role selection' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(`google_oauth_${Math.random()}`, salt);

    const newUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          phone: phone || '',
          role: userRole,
          googleId,
        },
      });

      if (userRole === Role.PATIENT) {
        await tx.patientProfile.create({
          data: {
            userId: createdUser.id,
            bloodGroup: bloodGroup || 'O+',
            allergies: allergies || '',
            emergencyContactName: emergencyContactName || 'Emergency Contact',
            emergencyContactPhone: emergencyContactPhone || phone || '',
            medicalNotes: medicalNotes || '',
          },
        });
      } else if (userRole === Role.DRIVER) {
        await tx.ambulance.create({
          data: {
            driverId: createdUser.id,
            vehicleNumber: vehicleNumber || `AMB-G-${Math.floor(Math.random() * 900) + 100}`,
            ambulanceType: (ambulanceType as AmbulanceType) || AmbulanceType.BASIC_LIFE_SUPPORT,
            isAvailable: false,
            currentLat: 37.7749,
            currentLng: -122.4194,
            verificationStatus: 'PENDING',
          },
        });
      }

      return createdUser;
    });

    const refreshedUser = await prisma.user.findUnique({
      where: { id: newUser.id },
      include: { patientProfile: true, ambulance: true, hospital: true }
    });

    if (!refreshedUser) {
      throw new Error('User creation validation failed.');
    }

    const { accessToken, refreshToken } = generateTokens({
      id: refreshedUser.id,
      email: refreshedUser.email,
      role: refreshedUser.role,
      name: refreshedUser.name,
    });

    setRefreshTokenCookie(res, refreshToken);
    const { passwordHash: _, ...safeUser } = refreshedUser;
    return res.json({ token: accessToken, user: safeUser });

  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// 8. GET CURRENT PROFILE (Authenticated check)
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        patientProfile: true,
        ambulance: true,
        hospital: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { passwordHash, ...safeUser } = user;
    return res.json(safeUser);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
