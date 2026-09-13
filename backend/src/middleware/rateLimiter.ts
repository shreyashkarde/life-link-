import { Request, Response, NextFunction } from 'express';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
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
    if (rateData.count > maxRequests) {
      return res.status(429).json({
        message: 'Too many requests from this IP, please try again later.',
      });
    }
    next();
  };
}
