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

    const roleUpper = (tokenDecode.role || '').toUpperCase();
    const isSuperAdminRole = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPERADMIN';
    if (tokenDecode.email !== ENV.ADMIN_EMAIL && !isSuperAdminRole) {
      res.status(403).json({ success: false, message: 'Not Authorized. Invalid Admin credentials.' });
      return;
    }

    // Attach user to req.user for downstream role validation
    (req as any).user = {
      id: (tokenDecode as any).id || 'admin_root',
      role: 'SUPER_ADMIN',
      email: tokenDecode.email || ENV.ADMIN_EMAIL,
    };

    next();
  } catch (error: any) {
    res.status(401).json({ success: false, message: error.message || 'Authentication failed' });
  }
};

export default authAdmin;

