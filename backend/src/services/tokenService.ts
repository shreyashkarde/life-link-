import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { ENV } from '../config/env';

export interface UserTokenPayload {
  id: string;
  role: 'admin' | 'doctor' | 'patient' | 'driver' | string;
  email: string;
}

export interface RefreshTokenPayload {
  id: string;
  role: string;
  tokenVersion?: number;
}

const ACCESS_TOKEN_SECRET = ENV.JWT_SECRET || 'prescripto_jwt_secret_key_2026';
const REFRESH_TOKEN_SECRET = (ENV.JWT_SECRET || 'prescripto_jwt_secret_key_2026') + '_refresh';

// Access Token: 15 minutes (short-lived)
const ACCESS_TOKEN_EXPIRY = '15m';
// Refresh Token: 7 days (long-lived)
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * 🔑 Token Service
 * Issues short-lived access tokens and secure HTTP-only refresh tokens.
 */
export class TokenService {
  /**
   * Generates a short-lived access token (stored in frontend memory only)
   */
  static generateAccessToken(payload: UserTokenPayload): string {
    return jwt.sign(
      {
        id: payload.id,
        role: payload.role.toLowerCase(),
        email: payload.email,
      },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
  }

  /**
   * Generates a long-lived refresh token
   */
  static generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(
      {
        id: payload.id,
        role: payload.role.toLowerCase(),
        tokenVersion: payload.tokenVersion || 1,
      },
      REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
  }

  /**
   * Verifies an access token
   */
  static verifyAccessToken(token: string): UserTokenPayload | null {
    try {
      return jwt.verify(token, ACCESS_TOKEN_SECRET) as UserTokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Verifies a refresh token
   */
  static verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      return jwt.verify(token, REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Sets secure HTTP-only cookie on response
   * NEVER exposed to frontend JavaScript / localStorage
   */
  static setRefreshTokenCookie(res: Response, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    // Max Age: 7 days in milliseconds
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // Prevents XSS script access
      secure: isProduction, // HTTPS only in production
      sameSite: 'lax', // CSRF mitigation
      path: '/',
      maxAge: maxAgeMs,
    });

    // Also set explicit header fallback for standard clients
    res.setHeader(
      'Set-Cookie',
      `refreshToken=${refreshToken}; HttpOnly; Path=/; Max-Age=${maxAgeMs / 1000}; SameSite=Lax${isProduction ? '; Secure' : ''}`
    );
  }

  /**
   * Clears refresh token cookie on logout
   */
  static clearRefreshTokenCookie(res: Response): void {
    res.cookie('refreshToken', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });
    res.setHeader('Set-Cookie', 'refreshToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  }

  /**
   * Helper to parse cookie string from req.headers.cookie
   */
  static parseCookies(cookieHeader?: string): Record<string, string> {
    const list: Record<string, string> = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      const name = parts[0]?.trim();
      if (!name) return;
      const value = parts.slice(1).join('=').trim();
      list[name] = decodeURIComponent(value);
    });
    return list;
  }
}

export default TokenService;
