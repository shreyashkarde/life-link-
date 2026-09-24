import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export const authDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dtoken =
      (req.headers.dtoken as string) ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : (req.headers.token as string)) ||
      req.cookies?.accessToken ||
      req.cookies?.dToken;

    if (!dtoken) {
      res.status(401).json({ success: false, message: 'Not Authorized. Please login as Doctor.' });
      return;
    }

    const tokenDecode = jwt.verify(dtoken, ENV.JWT_SECRET) as {
      id?: string;
      role?: string;
      email?: string;
    };

    if (!tokenDecode.id) {
      res.status(401).json({ success: false, message: 'Invalid Doctor Token' });
      return;
    }

    if (tokenDecode.role && tokenDecode.role.toLowerCase() !== 'doctor') {
      res.status(403).json({ success: false, message: 'Forbidden: Access restricted. Doctor role required.' });
      return;
    }

    // Attach docId and user to request body, locals, and req.user
    req.body.docId = tokenDecode.id;
    res.locals.docId = tokenDecode.id;
    (req as any).user = {
      id: tokenDecode.id,
      role: 'DOCTOR',
      email: tokenDecode.email || '',
    };

    next();
  } catch (error: any) {
    res.status(401).json({ success: false, message: error.message || 'Authentication failed' });
  }
};

export default authDoctor;

