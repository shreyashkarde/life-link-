import { Request, Response, NextFunction } from 'express';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    // In local development, allow high request volumes so logins/testing don't get 429 blocked
    const effectiveLimit = process.env.NODE_ENV === 'production' ? maxRequests : Math.max(maxRequests, 100);

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const key = `${req.path}:${ip}`;

    let rateData = rateLimitMap.get(key);
    if (!rateData || now > rateData.resetTime) {
      rateData = { count: 1, resetTime: now + windowMs };
      rateLimitMap.set(key, rateData);
      return next();
    }

    rateData.count++;
    if (rateData.count > effectiveLimit) {
      return res.status(429).json({
        message: 'Too many requests from this IP, please try again later.',
      });
    }
    next();
  };
}
