import { Request, Response, NextFunction } from 'express';

export interface HospitalIsolationRequest extends Request {
  hospitalId?: string;
  hospitalName?: string;
  user?: any;
}

/**
 * 🏥 resolveRequestHospitalId
 * Resolves hospitalId from headers, query params, request body, or authenticated user context.
 */
export const resolveRequestHospitalId = (req: Request): string | undefined => {
  const headerVal = req.headers['x-hospital-id'] as string;
  if (headerVal && headerVal.trim()) return headerVal.trim();

  const queryVal = (req.query?.hospitalId as string) || (req.query?.hospital_id as string);
  if (queryVal && queryVal.trim()) return queryVal.trim();

  const bodyVal = (req.body?.hospitalId as string) || (req.body?.hospital_id as string);
  if (bodyVal && bodyVal.trim()) return bodyVal.trim();

  const user = (req as any).user;
  if (user?.hospitalId && typeof user.hospitalId === 'string' && user.hospitalId.trim()) {
    return user.hospitalId.trim();
  }

  return undefined;
};

/**
 * 🛡️ hospitalContextMiddleware
 * Automatically extracts and attaches req.hospitalId to every request for uniform controller access.
 */
export const hospitalContextMiddleware = (
  req: HospitalIsolationRequest,
  _res: Response,
  next: NextFunction
): void => {
  const hospitalId = resolveRequestHospitalId(req);
  if (hospitalId) {
    req.hospitalId = hospitalId;
  }
  next();
};

/**
 * 🔒 enforceHospitalStaffBoundary
 * Strictly enforces that Hospital Admins, Doctors, and Drivers can ONLY access their own hospital's resources.
 * Super Admins are exempt and have global visibility.
 */
export const enforceHospitalStaffBoundary = (
  req: HospitalIsolationRequest,
  res: Response,
  next: NextFunction
): void => {
  const user = req.user;

  // If not authenticated or super admin, pass through to controller/subsequent guards
  if (!user || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
    return next();
  }

  const userHospitalId = user.hospitalId;
  const requestedHospitalId = resolveRequestHospitalId(req);

  // If user belongs to a specific hospital, ensure any explicitly requested hospital matches
  if (userHospitalId && requestedHospitalId && userHospitalId !== requestedHospitalId) {
    res.status(403).json({
      success: false,
      message: `Access Denied: Tenant boundary violation. Your account belongs to hospital '${userHospitalId}', but tried to access resources under hospital '${requestedHospitalId}'.`,
      code: 'HOSPITAL_TENANT_MISMATCH',
      userHospitalId,
      requestedHospitalId,
    });
    return;
  }

  // Force scoped hospitalId onto request for downstream database queries
  if (userHospitalId) {
    req.hospitalId = userHospitalId;
  }

  next();
};

/**
 * ⚖️ validateHospitalMatch
 * Reusable utility to validate that a doctor/driver/appointment/booking belongs to the expected hospital.
 */
export const validateHospitalMatch = (
  resourceType: 'Doctor' | 'Driver' | 'Ambulance' | 'Appointment' | 'AmbulanceBooking',
  resourceHospitalId: string | undefined,
  targetHospitalId: string | undefined
): { isValid: boolean; errorMessage?: string } => {
  if (!targetHospitalId || !resourceHospitalId) {
    return { isValid: true };
  }

  if (resourceHospitalId !== targetHospitalId) {
    return {
      isValid: false,
      errorMessage: `Cross-hospital mismatch: The requested ${resourceType} belongs to hospital '${resourceHospitalId}', but the operation requested hospital '${targetHospitalId}'. Inter-hospital cross-booking is strictly prohibited.`,
    };
  }

  return { isValid: true };
};

export default {
  resolveRequestHospitalId,
  hospitalContextMiddleware,
  enforceHospitalStaffBoundary,
  validateHospitalMatch,
};
