import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppContextProvider, { useApp } from './context/AppContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Patient Pages
import Home from './pages/Home';
import Doctors from './pages/Doctors';
import Appointment from './pages/Appointment';
import Login from './pages/Login';
import MyProfile from './pages/MyProfile';
import MyAppointments from './pages/MyAppointments';
import About from './pages/About';
import Contact from './pages/Contact';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

// Admin & Doctor Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AllAppointments from './pages/admin/AllAppointments';
import AddDoctor from './pages/admin/AddDoctor';
import DoctorsList from './pages/admin/DoctorsList';
import DoctorDashboard from './pages/admin/DoctorDashboard';
import DoctorAppointments from './pages/admin/DoctorAppointments';
import DoctorProfile from './pages/admin/DoctorProfile';

import EmergencySOSButton from './components/EmergencySOSButton';
import NotificationToast from './features/notifications/NotificationToast';

// 5 Role Dedicated Dashboards
import PatientDashboard from './pages/dashboards/PatientDashboard';
import DoctorPanelDashboard from './pages/dashboards/DoctorDashboard';
import HospitalAdminDashboard from './pages/dashboards/HospitalAdminDashboard';
import DriverDashboard from './pages/dashboards/DriverDashboard';
import SuperAdminDashboard from './pages/dashboards/SuperAdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

// Patient Layout wrapper
const PatientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="mx-4 sm:mx-[10%]">
      <Navbar />
      {children}
      <EmergencySOSButton />
      <NotificationToast />
      <Footer />
    </div>
  );
};

// Admin route index resolver
const AdminIndex: React.FC = () => {
  const { aToken, dToken } = useApp();
  if (aToken) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (dToken) {
    return <Navigate to="/admin/doctor-dashboard" replace />;
  }
  return <AdminDashboard />;
};

export const App: React.FC = () => {
  return (
    <AppContextProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Primary Portal Entry: Unified 5-Role Login Page */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route
            path="/doctors"
            element={
              <PatientLayout>
                <Doctors />
              </PatientLayout>
            }
          />
          <Route
            path="/doctors/:speciality"
            element={
              <PatientLayout>
                <Doctors />
              </PatientLayout>
            }
          />
          <Route
            path="/appointment/:docId"
            element={
              <PatientLayout>
                <Appointment />
              </PatientLayout>
            }
          />
          <Route
            path="/my-profile"
            element={
              <PatientLayout>
                <MyProfile />
              </PatientLayout>
            }
          />
          <Route
            path="/my-appointments"
            element={
              <PatientLayout>
                <MyAppointments />
              </PatientLayout>
            }
          />
          <Route
            path="/about"
            element={
              <PatientLayout>
                <About />
              </PatientLayout>
            }
          />
          <Route
            path="/contact"
            element={
              <PatientLayout>
                <Contact />
              </PatientLayout>
            }
          />

          {/* 5 Dedicated Role Dashboards (Protected by Role) */}
          <Route
            path="/patient/dashboard"
            element={
              <ProtectedRoute allowedRoles={['PATIENT', 'USER']}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['DOCTOR']}>
                <DoctorPanelDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospital/dashboard"
            element={
              <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'ADMIN_HOSPITAL', 'ADMIN', 'SUPER_ADMIN']}>
                <HospitalAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver/dashboard"
            element={
              <ProtectedRoute allowedRoles={['DRIVER']}>
                <DriverDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'SUPERADMIN']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin & Doctor Panel Routes (Protected) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'SUPERADMIN', 'DOCTOR']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminIndex />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'SUPERADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="all-appointments"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'SUPERADMIN']}>
                  <AllAppointments />
                </ProtectedRoute>
              }
            />
            <Route
              path="add-doctor"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'SUPERADMIN']}>
                  <AddDoctor />
                </ProtectedRoute>
              }
            />
            <Route
              path="doctor-list"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'SUPERADMIN']}>
                  <DoctorsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="doctor-dashboard"
              element={
                <ProtectedRoute allowedRoles={['DOCTOR']}>
                  <DoctorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="doctor-appointments"
              element={
                <ProtectedRoute allowedRoles={['DOCTOR']}>
                  <DoctorAppointments />
                </ProtectedRoute>
              }
            />
            <Route
              path="doctor-profile"
              element={
                <ProtectedRoute allowedRoles={['DOCTOR']}>
                  <DoctorProfile />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppContextProvider>
  );
};

export default App;
