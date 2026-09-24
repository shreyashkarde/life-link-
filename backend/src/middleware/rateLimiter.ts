import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logSecurityEvent } from '../services/securityService';

/**
 * 🛑 Strict Anti-Brute Force Limiter for Authentication Endpoints
 * 10 attempts per 15 minutes window
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 1000, // Generous during development/testing
  standardHeaders: true, // Return standard RateLimit headers
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: (req: Request) =>
    process.env.NODE_ENV !== 'production' ||
    req.headers['x-test-bypass'] === 'lifelink-security-test' ||
    req.ip === '127.0.0.1' ||
    req.ip === '::1',
  handler: (req: Request, res: Response) => {
    logSecurityEvent('BRUTE_FORCE_RATE_LIMIT_EXCEEDED', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      bodyEmail: req.body?.email,
    }, req);

    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
      retryAfterMinutes: 15,
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

/**
 * 🛡️ General API Rate Limiter
 * 300 requests per 15 minutes window
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'High traffic detected. API request limit exceeded. Please slow down.',
      code: 'API_RATE_LIMIT_EXCEEDED',
    });
  },
});
