import { Request, Response, NextFunction } from 'express';

export type AppRole = 'SUPER_ADMIN' | 'HOSPITAL_ADMIN' | 'DRIVER' | 'DOCTOR' | 'PATIENT' | 'admin' | 'doctor' | 'patient';

/**
 * 🔒 role.ts (Role-Based Access Control Middleware)
 * Strictly verifies role permissions.
 * Rejects unauthorized roles with 403 Forbidden.
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required',
      });
      return;
    }

    const userRole = (req.user.role || '').toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

    // Normalize super admin aliases
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    const isHospitalAdmin = userRole === 'HOSPITAL_ADMIN' || userRole === 'ADMIN_HOSPITAL';

    const hasPermission =
      normalizedAllowed.includes(userRole) ||
      (isSuperAdmin && (normalizedAllowed.includes('SUPER_ADMIN') || normalizedAllowed.includes('ADMIN'))) ||
      (isHospitalAdmin && (normalizedAllowed.includes('HOSPITAL_ADMIN') || normalizedAllowed.includes('ADMIN_HOSPITAL')));

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Role '${req.user.role}' lacks required permissions.`,
        requiredRoles: allowedRoles,
      });
      return;
    }

    next();
  };
};

/**
 * 🛡️ enforceResourceOwnership
 * Ensures patient can only access own data, doctor only own appointments, driver only own trips.
 */
export const enforceResourceOwnership = (paramKey: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const requestedId = req.params[paramKey] || req.query[paramKey] || req.body[paramKey];
    const isOwner = req.user.id === requestedId;

    if (!isOwner && req.user.role !== 'admin' && req.user.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot access or modify another user\'s private records',
      });
      return;
    }

    next();
  };
};

export default requireRole;
