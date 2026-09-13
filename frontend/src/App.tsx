import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { HeartbeatLoader } from './components/ui/HeartbeatLoader';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import PatientDashboard from './pages/PatientDashboard';
import DriverDashboard from './pages/DriverDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminLogin from './pages/AdminLogin';
import SuperAdminLogin from './pages/SuperAdminLogin';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-gray-900 dark:text-slate-100 transition-colors">
        <div className="flex flex-col items-center gap-5">
          <HeartbeatLoader size="large" />
          <span className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    // Route unauthenticated visitors to their designated portal
    if (allowedRoles.includes('SUPER_ADMIN')) {
      return <Navigate to="/super-admin/login" replace />;
    }
    if (allowedRoles.includes('ADMIN_HOSPITAL')) {
      return <Navigate to="/admin/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Allow SUPER_ADMIN to inspect hospital admin views
    if (user.role === 'SUPER_ADMIN' && allowedRoles.includes('ADMIN_HOSPITAL')) {
      return <>{children}</>;
    }

    // Redirect to default home for their role
    if (user.role === 'PATIENT') return <Navigate to="/patient" replace />;
    if (user.role === 'DRIVER') return <Navigate to="/driver" replace />;
    if (user.role === 'ADMIN_HOSPITAL') return <Navigate to="/hospital" replace />;
    if (user.role === 'SUPER_ADMIN') return <Navigate to="/super-admin" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/super-admin/login" element={<SuperAdminLogin />} />

      <Route
        path="/patient"
        element={
          <ProtectedRoute allowedRoles={['PATIENT']}>
            <PatientDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/driver"
        element={
          <ProtectedRoute allowedRoles={['DRIVER']}>
            <DriverDashboard />
          </ProtectedRoute>
        }
      />

      {/* Hospital Admin Routes (accessible via /hospital, /admin, or /admin/dashboard) */}
      <Route
        path="/hospital"
        element={
          <ProtectedRoute allowedRoles={['ADMIN_HOSPITAL', 'SUPER_ADMIN']}>
            <HospitalDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN_HOSPITAL', 'SUPER_ADMIN']}>
            <HospitalDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ADMIN_HOSPITAL', 'SUPER_ADMIN']}>
            <HospitalDashboard />
          </ProtectedRoute>
        }
      />

      {/* Super Admin Routes */}
      <Route
        path="/super-admin"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Redirects */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
