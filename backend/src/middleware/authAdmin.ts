import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export const authAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const atoken =
      (req.headers.atoken as string) ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : (req.headers.token as string));

    if (!atoken) {
      res.status(401).json({ success: false, message: 'Not Authorized. Please login as Admin.' });
      return;
    }

    const tokenDecode = jwt.verify(atoken, ENV.JWT_SECRET) as {
      email?: string;
      role?: string;
    };

    if (tokenDecode.email !== ENV.ADMIN_EMAIL && tokenDecode.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Not Authorized. Invalid Admin credentials.' });
      return;
    }

    next();
  } catch (error: any) {
    console.error('Admin Auth Error:', error.message);
    res.status(401).json({ success: false, message: error.message || 'Authentication failed' });
  }
};

export default authAdmin;
