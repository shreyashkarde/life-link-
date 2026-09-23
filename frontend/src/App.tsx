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
import LiveFeaturesShowcase from './features/LiveFeaturesShowcase';
import NotificationToast from './features/notifications/NotificationToast';

// 5 Role Dedicated Dashboards
import PatientDashboard from './pages/dashboards/PatientDashboard';
import DoctorPanelDashboard from './pages/dashboards/DoctorDashboard';
import HospitalAdminDashboard from './pages/dashboards/HospitalAdminDashboard';
import DriverDashboard from './pages/dashboards/DriverDashboard';
import SuperAdminDashboard from './pages/dashboards/SuperAdminDashboard';

// Patient Layout wrapper
const PatientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="mx-4 sm:mx-[10%]">
      <Navbar />
      {children}
      <EmergencySOSButton />
      <NotificationToast />
      {/* Non-intrusive floating link to Live Features Showcase */}
      <a
        href="/features"
        className="fixed bottom-6 left-6 z-50 bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-semibold px-3.5 py-2 rounded-full shadow-lg border border-blue-400/40 backdrop-blur-md flex items-center gap-2 transition-all hover:scale-105"
        title="Open 8 Live Modular Features Showcase"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>⚡ Live Features Showcase</span>
      </a>
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
          {/* Primary Portal Entry: Dedicated Full-Screen Login Page */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />

          {/* Optional Home / Landing Page */}
          <Route
            path="/home"
            element={
              <PatientLayout>
                <Home />
              </PatientLayout>
            }
          />
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
          {/* Advanced Modular Features Showcase Route */}
          <Route path="/features" element={<LiveFeaturesShowcase />} />

          {/* 5 Dedicated Role Dashboards */}
          <Route path="/patient/dashboard" element={<PatientDashboard />} />
          <Route path="/doctor/dashboard" element={<DoctorPanelDashboard />} />
          <Route path="/hospital/dashboard" element={<HospitalAdminDashboard />} />
          <Route path="/driver/dashboard" element={<DriverDashboard />} />
          <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />

          {/* Modular Real-Time Features Dashboards */}
          <Route path="/features/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/features/doctor-dashboard" element={<DoctorPanelDashboard />} />
          <Route path="/features/admin-dashboard" element={<SuperAdminDashboard />} />

          {/* Admin & Doctor Panel Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminIndex />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="all-appointments" element={<AllAppointments />} />
            <Route path="add-doctor" element={<AddDoctor />} />
            <Route path="doctor-list" element={<DoctorsList />} />
            <Route path="doctor-dashboard" element={<DoctorDashboard />} />
            <Route path="doctor-appointments" element={<DoctorAppointments />} />
            <Route path="doctor-profile" element={<DoctorProfile />} />
          </Route>

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppContextProvider>
  );
};

export default App;
