import { Request, Response, NextFunction } from 'express';

/**
 * 🔐 Role-Based Access Control (RBAC) Middleware
 * Enforces role authorization: e.g. authorizeRoles('admin'), authorizeRoles('doctor', 'admin')
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required',
      });
      return;
    }

    const userRole = (req.user.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

    if (!normalizedAllowed.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]. Your role '${req.user.role}' has insufficient privileges.`,
      });
      return;
    }

    next();
  };
};

export default authorizeRoles;
