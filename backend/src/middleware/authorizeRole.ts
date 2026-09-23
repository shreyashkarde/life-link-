import { Request, Response, NextFunction } from 'express';

/**
 * 🛡️ authorizeRole.ts (Role-Based Access Control Middleware)
 * Strictly verifies user role against allowed roles.
 * Usage:
 *   authorizeRole('admin', 'doctor')
 *   authorizeRole(['admin', 'super_admin'])
 */
export const authorizeRole = (...roles: (string | string[])[]) => {
  // Flatten in case array or comma-separated strings are passed
  const allowedRoles = roles
    .flat()
    .map((r) => r.trim().toUpperCase());

  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Verify user exists on request (populated by authenticateJWT)
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required',
      });
      return;
    }

    // 2. Validate req.user.role
    if (!user.role || typeof user.role !== 'string') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Access denied. Missing or invalid user role.',
      });
      return;
    }

    const currentRole = user.role.trim().toUpperCase();

    // 3. Normalization helpers for role aliases
    const isSuperAdmin = currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN' || currentRole === 'SUPERADMIN';
    const isHospitalAdmin = currentRole === 'HOSPITAL_ADMIN' || currentRole === 'ADMIN_HOSPITAL';
    const isPatient = currentRole === 'PATIENT' || currentRole === 'USER';

    const isAuthorized =
      allowedRoles.includes(currentRole) ||
      (isSuperAdmin && (allowedRoles.includes('ADMIN') || allowedRoles.includes('SUPER_ADMIN') || allowedRoles.includes('SUPERADMIN'))) ||
      (isHospitalAdmin && (allowedRoles.includes('HOSPITAL_ADMIN') || allowedRoles.includes('ADMIN_HOSPITAL'))) ||
      (isPatient && (allowedRoles.includes('PATIENT') || allowedRoles.includes('USER')));

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Role '${user.role}' lacks required permissions.`,
        requiredRoles: allowedRoles,
      });
      return;
    }

    next();
  };
};

export default authorizeRole;
