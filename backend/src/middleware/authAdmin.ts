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
      id?: string;
      email?: string;
      role?: string;
      hospitalId?: string;
      hospitalName?: string;
    };

    const roleUpper = (tokenDecode.role || '').toUpperCase();
    const isAdminRole =
      roleUpper === 'ADMIN' ||
      roleUpper === 'SUPER_ADMIN' ||
      roleUpper === 'SUPERADMIN' ||
      roleUpper === 'ADMIN_HOSPITAL' ||
      roleUpper === 'HOSPITAL_ADMIN' ||
      roleUpper === 'ADMIN_ROOT';

    const isAuthorizedEmail =
      tokenDecode.email === ENV.ADMIN_EMAIL ||
      tokenDecode.email === 'hospital@prescripto.com' ||
      tokenDecode.email?.toLowerCase().includes('admin') ||
      tokenDecode.email?.toLowerCase().includes('hospital');

    if (!isAdminRole && !isAuthorizedEmail) {
      res.status(403).json({ success: false, message: 'Not Authorized. Invalid Admin credentials.' });
      return;
    }

    // Attach user to req.user for downstream role validation & hospital context
    (req as any).user = {
      id: tokenDecode.id || 'admin_root',
      role: tokenDecode.role || 'ADMIN_HOSPITAL',
      email: tokenDecode.email || ENV.ADMIN_EMAIL,
      hospitalId: tokenDecode.hospitalId || (req.headers['x-hospital-id'] as string) || 'hosp_lilavati',
      hospitalName: tokenDecode.hospitalName || 'Lilavati Hospital & Research Centre',
    };

    next();
  } catch (error: any) {
    res.status(401).json({ success: false, message: error.message || 'Authentication failed' });
  }
};

export default authAdmin;

