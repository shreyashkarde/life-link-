/**
 * 🛡️ /middleware/authorizeRole.js (Root RBAC Middleware)
 * Compatible with backend Express router and root-level imports
 */
const authorizeRole = (...roles) => {
  const allowedRoles = roles
    .flat()
    .map((r) => String(r).trim().toUpperCase());

  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required',
      });
    }

    if (!user.role || typeof user.role !== 'string') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Access denied. Missing or invalid user role.',
      });
    }

    const currentRole = user.role.trim().toUpperCase();

    const isSuperAdmin = currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN' || currentRole === 'SUPERADMIN';
    const isHospitalAdmin = currentRole === 'HOSPITAL_ADMIN' || currentRole === 'ADMIN_HOSPITAL';
    const isPatient = currentRole === 'PATIENT' || currentRole === 'USER';

    const isAuthorized =
      allowedRoles.includes(currentRole) ||
      (isSuperAdmin && (allowedRoles.includes('ADMIN') || allowedRoles.includes('SUPER_ADMIN') || allowedRoles.includes('SUPERADMIN'))) ||
      (isHospitalAdmin && (allowedRoles.includes('HOSPITAL_ADMIN') || allowedRoles.includes('ADMIN_HOSPITAL'))) ||
      (isPatient && (allowedRoles.includes('PATIENT') || allowedRoles.includes('USER')));

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Role '${user.role}' lacks required permissions.`,
        requiredRoles: allowedRoles,
      });
    }

    next();
  };
};

module.exports = authorizeRole;
module.exports.authorizeRole = authorizeRole;
module.exports.default = authorizeRole;
