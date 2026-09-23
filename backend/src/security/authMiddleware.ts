import { Request, Response, NextFunction } from 'express';
import { TokenService, UserTokenPayload } from '../services/tokenService';

// Extend Express Request to include user payload
declare global {
  namespace Express {
    interface Request {
      user?: UserTokenPayload;
    }
  }
}

/**
 * 🛡️ authMiddleware
 * Verifies short-lived access token from Authorization: Bearer <token>
 * Attaches decoded user { id, role, email } to req.user
 */
export const authenticateUser = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization || (req.headers.token as string);

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'Access Denied: Missing Authorization token',
      });
      return;
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access Denied: Invalid Bearer token format',
      });
      return;
    }

    const decoded = TokenService.verifyAccessToken(token);

    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Access Denied: Token is invalid or has expired',
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

export default authenticateUser;
