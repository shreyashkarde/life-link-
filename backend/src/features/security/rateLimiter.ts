import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const ipBuckets = new Map<string, RateLimitEntry>();

// Cleanup stale IPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipBuckets.entries()) {
    if (now > entry.resetTime) {
      ipBuckets.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Selective In-Memory Rate Limiter Middleware
 * @param maxRequests Maximum requests allowed within window
 * @param windowMs Time window in milliseconds (default: 1 minute)
 */
export const rateLimiter = (maxRequests = 60, windowMs = 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const now = Date.now();
    const entry = ipBuckets.get(clientIp);

    if (!entry || now > entry.resetTime) {
      ipBuckets.set(clientIp, {
        count: 1,
        resetTime: now + windowMs,
      });
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      return next();
    }

    if (entry.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);

      return res.status(429).json({
        success: false,
        message: `Too many requests from this IP. Please try again in ${retryAfterSeconds} seconds.`,
        retryAfter: retryAfterSeconds,
      });
    }

    entry.count += 1;
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - entry.count);
    return next();
  };
};

export default rateLimiter;
