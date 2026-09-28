import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
    hospitalId?: string;
    tokenId?: string;
  };
}

/**
 * 🔐 Enterprise Authentication Middleware
 * Extracts and validates JWT access token from:
 * 1. httpOnly cookie (req.cookies.accessToken)
 * 2. Authorization header (Bearer <token>)
 * 3. Custom role token headers (token, dToken, aToken)
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  try {
    let token = req.cookies?.accessToken || req.cookies?.token;

    if (!token) {
      const authHeader =
        (req.headers.authorization as string) ||
        (req.headers.token as string) ||
        (req.headers.dtoken as string) ||
        (req.headers.atoken as string);

      if (authHeader) {
        token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      }
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access Denied: Missing Authorization token or cookie',
        code: 'AUTH_TOKEN_MISSING',
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
      (req as any).user = decoded;
      res.locals.userId = decoded.id;
      res.locals.role = decoded.role;
      next();
    } catch (err: any) {
      res.status(401).json({
        success: false,
        message: 'Access Denied: Token has expired or is invalid. Please refresh token.',
        code: 'AUTH_TOKEN_INVALID',
      });
      return;
    }
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_FAILED',
    });
  }
};

/**
 * 🛡️ Role-Based Access Control (RBAC) Guard
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user || !user.role) {
      res.status(403).json({
        success: false,
        message: 'Access Denied: User role context missing',
        code: 'ROLE_MISSING',
      });
      return;
    }

    const normalizedRole = user.role.toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

    if (!normalizedAllowed.includes(normalizedRole)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Required role in [${allowedRoles.join(', ')}], but current user role is '${user.role}'.`,
        code: 'ROLE_FORBIDDEN',
      });
      return;
    }

    next();
  };
};

/**
 * 🚑 Optional Authentication Middleware for Emergency SOS & Public Booking
 * If valid JWT token is provided, attaches user context.
 * If no token provided or expired, assigns guest patient identity so emergency dispatch is NEVER blocked.
 */
export const optionalAuthenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  try {
    let token = req.cookies?.accessToken || req.cookies?.token;

    if (!token) {
      const authHeader =
        (req.headers.authorization as string) ||
        (req.headers.token as string) ||
        (req.headers.dtoken as string) ||
        (req.headers.atoken as string);

      if (authHeader) {
        token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      }
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
        (req as any).user = decoded;
        res.locals.userId = decoded.id;
        res.locals.role = decoded.role;
        return next();
      } catch {
        // Fallback to guest for emergency dispatch
      }
    }

    // Assign fallback guest identity
    (req as any).user = {
      id: 'patient_guest_' + Date.now(),
      role: 'PATIENT',
      email: 'patient@prescripto.com',
    };
    res.locals.userId = (req as any).user.id;
    res.locals.role = 'PATIENT';
    next();
  } catch {
    (req as any).user = {
      id: 'patient_guest_' + Date.now(),
      role: 'PATIENT',
      email: 'patient@prescripto.com',
    };
    next();
  }
};

export const authenticate = authenticateJWT;
export default authenticateJWT;

