import React, { useMemo, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Helper to securely decode JWT payload without external library
 */
export const decodeJwtPayload = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/**
 * 🔒 /components/ProtectedRoute.jsx
 * - Enforces role-based access control on frontend routes
 * - Validates cryptographic token expiry & payload
 * - Redirects unauthorized users
 */
export const ProtectedRoute = ({
  allowedRoles,
  children,
  redirectTo = '/login',
}) => {
  const location = useLocation();

  const activeToken = useMemo(() => {
    const tokens = [
      sessionStorage.getItem('token'),
      sessionStorage.getItem('aToken'),
      sessionStorage.getItem('dToken'),
    ].filter(Boolean);

    if (tokens.length === 0) return '';

    if (allowedRoles && allowedRoles.length > 0) {
      const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());
      const matchingToken = tokens.find((t) => {
        const payload = decodeJwtPayload(t);
        if (!payload || !payload.role) return false;
        const role = payload.role.toUpperCase();
        return (
          normalizedAllowed.includes(role) ||
          ((role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'SUPERADMIN') &&
            (normalizedAllowed.includes('ADMIN') || normalizedAllowed.includes('SUPER_ADMIN') || normalizedAllowed.includes('SUPERADMIN'))) ||
          ((role === 'HOSPITAL_ADMIN' || role === 'ADMIN_HOSPITAL') &&
            (normalizedAllowed.includes('HOSPITAL_ADMIN') || normalizedAllowed.includes('ADMIN_HOSPITAL'))) ||
          ((role === 'PATIENT' || role === 'USER') &&
            (normalizedAllowed.includes('PATIENT') || normalizedAllowed.includes('USER'))) ||
          (role === 'DOCTOR' && normalizedAllowed.includes('DOCTOR')) ||
          (role === 'DRIVER' && normalizedAllowed.includes('DRIVER'))
        );
      });
      if (matchingToken) return matchingToken;
    }

    return tokens[0] || '';
  }, [allowedRoles]);

  const decoded = useMemo(() => {
    if (!activeToken) return null;
    return decodeJwtPayload(activeToken);
  }, [activeToken]);

  const isExpired = useMemo(() => {
    if (!decoded) return false;
    return Boolean(decoded.exp && decoded.exp * 1000 < Date.now());
  }, [decoded]);

  const hasAccess = useMemo(() => {
    if (!decoded || isExpired) return false;
    if (!allowedRoles || allowedRoles.length === 0) return true;

    const userRole = (decoded.role || 'PATIENT').toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'SUPERADMIN';
    const isHospitalAdmin = userRole === 'HOSPITAL_ADMIN' || userRole === 'ADMIN_HOSPITAL';
    const isPatient = userRole === 'PATIENT' || userRole === 'USER';
    const isDoctor = userRole === 'DOCTOR';
    const isDriver = userRole === 'DRIVER';

    return (
      normalizedAllowed.includes(userRole) ||
      (isSuperAdmin && (normalizedAllowed.includes('ADMIN') || normalizedAllowed.includes('SUPER_ADMIN') || normalizedAllowed.includes('SUPERADMIN'))) ||
      (isHospitalAdmin && (normalizedAllowed.includes('HOSPITAL_ADMIN') || normalizedAllowed.includes('ADMIN_HOSPITAL'))) ||
      (isPatient && (normalizedAllowed.includes('PATIENT') || normalizedAllowed.includes('USER'))) ||
      (isDoctor && normalizedAllowed.includes('DOCTOR')) ||
      (isDriver && normalizedAllowed.includes('DRIVER'))
    );
  }, [decoded, isExpired, allowedRoles]);

  useEffect(() => {
    if (activeToken && (!decoded || isExpired)) {
      sessionStorage.clear();
      localStorage.removeItem('token');
      localStorage.removeItem('aToken');
      localStorage.removeItem('dToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('user');
    }
  }, [activeToken, decoded, isExpired]);

  // Unauthenticated, expired, or unauthorized role check
  if (!activeToken || !decoded || isExpired || !hasAccess) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

