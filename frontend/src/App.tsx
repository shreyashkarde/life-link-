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

import EmergencySOSButton from './components/EmergencySOSButton';
import NotificationToast from './features/notifications/NotificationToast';

// 3 Core Role Dedicated Dashboards
import PatientDashboard from './pages/dashboards/PatientDashboard';
import DoctorPanelDashboard from './pages/dashboards/DoctorDashboard';
import DriverDashboard from './pages/dashboards/DriverDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import TrackingPage from './modules/patient/TrackingPage';
import HybridHospitalMap from './modules/hospitals/HybridHospitalMap';

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

export const App: React.FC = () => {
  return (
    <AppContextProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Primary Portal Entry: Secure Authentication Login Page */}
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
          {/* Hybrid Hospital Discovery (Google Places Live GPS) */}
          <Route
            path="/nearby-hospitals"
            element={
              <PatientLayout>
                <div className="py-6">
                  <HybridHospitalMap />
                </div>
              </PatientLayout>
            }
          />
          {/* Live Patient Ambulance Tracking Page (Uber/Porter Style) */}
          <Route path="/tracking/:bookingId" element={<TrackingPage />} />
          <Route path="/tracking" element={<TrackingPage />} />

          {/* 3 Dedicated Role Dashboards (Strictly Protected by Role) */}
          <Route
            path="/patient/dashboard"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
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
            path="/driver/dashboard"
            element={
              <ProtectedRoute allowedRoles={['DRIVER']}>
                <DriverDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppContextProvider>
  );
};

export default App;
