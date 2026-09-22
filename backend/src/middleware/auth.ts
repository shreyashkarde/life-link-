import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { User, IUser } from '../models/User';
import { isMongoConnected } from '../config/db';
import { memoryStore } from '../config/mockStore';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication token missing or invalid.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as { id: string; role: string };

    let user: any = null;

    if (isMongoConnected()) {
      user = await User.findById(decoded.id).select('-password');
    } else {
      user = memoryStore.users.find(
        (u) => (u._id && u._id.toString() === decoded.id) || (u.id && u.id.toString() === decoded.id)
      );
    }

    if (!user || (user.isActive !== undefined && !user.isActive)) {
      res.status(401).json({ success: false, message: 'User not found or account deactivated.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
};
