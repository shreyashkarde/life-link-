import { Request, Response, NextFunction } from 'express';

/**
 * ⚡ Rate limiter disabled for smooth, uninterrupted deployments & unrestricted testing
 */
export const authLimiter = (_req: Request, _res: Response, next: NextFunction): void => {
  next();
};

export const apiLimiter = (_req: Request, _res: Response, next: NextFunction): void => {
  next();
};

export default { authLimiter, apiLimiter };
