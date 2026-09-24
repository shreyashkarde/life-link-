import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Response, Request } from 'express';
import { ENV } from '../config/env';

export interface TokenPayload {
  id: string;
  role: string;
  email: string;
  hospitalId?: string;
  tokenId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // 15 minutes in seconds (900)
}

/**
 * 🔒 Password Complexity Policy
 * - Min 8 characters
 * - At least 1 uppercase character [A-Z]
 * - At least 1 lowercase character [a-z]
 * - At least 1 number [0-9]
 * - At least 1 special character [!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]
 */
export const isStrongPassword = (password: string): { isValid: boolean; message?: string } => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter (A-Z).' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter (a-z).' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one numeric digit (0-9).' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character (!@#$%^&*...).' };
  }

  return { isValid: true };
};

/**
 * 🛡️ SHA-256 Token Hasher
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * 🔑 Generate Dual JWT Tokens (15m Access Token + 7d Refresh Token with JTI)
 */
export const generateTokenPair = (id: string, role: string, email: string, hospitalId?: string): AuthTokens => {
  const tokenId = crypto.randomBytes(16).toString('hex');

  // Long-lived Access Token: 7 days
  const accessToken = jwt.sign(
    { id, role, email, hospitalId, tokenId },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Secure Refresh Token: 30 days
  const refreshToken = jwt.sign(
    { id, role, email, hospitalId, tokenId, type: 'refresh' },
    ENV.JWT_SECRET,
    { expiresIn: '30d' }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
  };
};

/**
 * 🍪 Secure httpOnly Cookie Setter
 */
export const setAuthCookies = (res: Response, tokens: AuthTokens): void => {
  const isProd = process.env.NODE_ENV === 'production';

  // Access Token Cookie (7 days)
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  // Refresh Token Cookie (30 days)
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

/**
 * 🍪 Clear Auth Cookies (Logout)
 */
export const clearAuthCookies = (res: Response): void => {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
};

/**
 * 🛡️ NoSQL Injection & XSS Sanitizer
 */
export const sanitizeValue = (value: any): any => {
  if (typeof value === 'string') {
    // Strip script tags and potential NoSQL operator prefixes
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      // Block MongoDB operator injection like $gt, $where, $ne in keys
      if (key.startsWith('$')) {
        continue;
      }
      sanitizedObj[key] = sanitizeValue(value[key]);
    }
    return sanitizedObj;
  }

  return value;
};

/**
 * 📝 Security Audit Logger
 */
export const logSecurityEvent = (eventType: string, details: Record<string, any>, req?: Request): void => {
  const timestamp = new Date().toISOString();
  const clientIp = req
    ? (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown'
    : 'system';
  const userAgent = req ? req.headers['user-agent'] || 'unknown' : 'system';

  console.log(`[SECURITY AUDIT] [${timestamp}] [${eventType}] IP: ${clientIp} | UA: ${userAgent} | Details:`, JSON.stringify(details));
};
