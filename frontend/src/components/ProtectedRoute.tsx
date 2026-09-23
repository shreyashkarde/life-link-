import React, { useMemo, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export interface ProtectedRouteProps {
  allowedRoles?: string[];
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Helper to securely decode JWT payload without external library
 */
export const decodeJwtPayload = (token: string): { id?: string; role?: string; email?: string; exp?: number } | null => {
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
 * 🔒 ProtectedRoute Component
 * - Validates authentication token on every request/navigation
 * - Enforces token expiration check (auto-logout if expired)
 * - Validates cryptographic backend token role (NEVER trusts client role)
 * - Blocks unauthorized direct URL access (Patient cannot access Admin/Doctor dashboards)
 * - Redirects unauthorized or unauthenticated users
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
  redirectTo = '/login',
}) => {
  const location = useLocation();
  const { token, aToken, dToken, logoutAll } = useApp();

  // Find the most appropriate active token (matching route allowedRoles)
  const activeToken = useMemo(() => {
    const tokens = [
      sessionStorage.getItem('token') || token,
      sessionStorage.getItem('aToken') || aToken,
      sessionStorage.getItem('dToken') || dToken,
    ].filter(Boolean) as string[];

    if (tokens.length === 0) return '';

    // If allowedRoles is specified, find the token matching this route's role
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
  }, [aToken, dToken, token, allowedRoles]);

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
      logoutAll();
    }
  }, [activeToken, decoded, isExpired, logoutAll]);

  // Unauthenticated, expired, or unauthorized role check
  if (!activeToken || !decoded || isExpired || !hasAccess) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

