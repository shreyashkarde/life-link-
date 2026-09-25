import { Request, Response, NextFunction } from 'express';

/**
 * ⚡ Rate limiter disabled for smooth, unrestricted API access
 */
export const rateLimiter = (_maxRequests = 30, _windowMs = 60 * 1000) => {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    next();
  };
};

export default rateLimiter;
