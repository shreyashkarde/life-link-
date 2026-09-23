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
        : (req.headers.token as string));

    if (!dtoken) {
      res.status(401).json({ success: false, message: 'Not Authorized. Please login as Doctor.' });
      return;
    }

    const tokenDecode = jwt.verify(dtoken, ENV.JWT_SECRET) as {
      id?: string;
      role?: string;
    };

    if (!tokenDecode.id) {
      res.status(401).json({ success: false, message: 'Invalid Doctor Token' });
      return;
    }

    // Attach docId to request body and locals
    req.body.docId = tokenDecode.id;
    res.locals.docId = tokenDecode.id;

    next();
  } catch (error: any) {
    console.error('Doctor Auth Error:', error.message);
    res.status(401).json({ success: false, message: error.message || 'Authentication failed' });
  }
};

export default authDoctor;
