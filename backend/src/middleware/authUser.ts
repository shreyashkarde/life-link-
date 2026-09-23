import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export const authUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      (req.headers.token as string) ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : undefined);

    if (!token) {
      res.status(401).json({ success: false, message: 'Not Authorized. Please login to your account.' });
      return;
    }

    const tokenDecode = jwt.verify(token, ENV.JWT_SECRET) as {
      id?: string;
    };

    if (!tokenDecode.id) {
      res.status(401).json({ success: false, message: 'Invalid Session Token' });
      return;
    }

    // Attach userId to request body and locals
    req.body.userId = tokenDecode.id;
    res.locals.userId = tokenDecode.id;

    next();
  } catch (error: any) {
    console.error('User Auth Error:', error.message);
    res.status(401).json({ success: false, message: error.message || 'Authentication failed' });
  }
};

export default authUser;
