import React from 'react';
import { NavLink, Outlet, useNavigate, Link, Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export const AdminLayout: React.FC = () => {
  const { aToken, dToken, doctorData, logoutAll } = useApp();
  const navigate = useNavigate();

  // If neither Admin nor Doctor is logged in, redirect to unified login page
  if (!aToken && !dToken) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logoutAll();
    navigate('/login');
  };

  return (
    <div className="bg-[#F8F9FD] min-h-screen -mx-4 sm:-mx-8 px-4 sm:px-8">
      {/* Top Navbar */}
      <div className="flex items-center justify-between px-4 sm:px-10 py-3 border-b bg-white">
        <div className="flex items-center gap-3 text-xs">
          <Link to="/admin/dashboard" className="flex items-center gap-2.5">
            <img
              src="/lifelink_logo.png"
              alt="LifeLink Logo"
              className="w-8 h-8 object-contain rounded-full shadow-xs"
            />
            <span className="text-xl font-bold tracking-tight text-gray-900 flex items-center">
              <span className="text-blue-600">Life</span>Link
            </span>
          </Link>
          <span className="border px-3 py-1 rounded-full border-gray-400 text-gray-600 font-semibold uppercase text-[10px]">
            {aToken ? 'Admin Panel' : `Doctor Panel: ${doctorData?.name || ''}`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/patient/dashboard"
            className="text-xs font-semibold text-gray-600 hover:text-primary transition-colors hidden sm:block"
          >
            ← Patient View
          </Link>
          <button
            onClick={handleLogout}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-6 py-2 rounded-full transition-all shadow-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area with Sidebar */}
      <div className="flex items-start">
        {/* Sidebar */}
        <div className="min-h-screen bg-white border-r w-48 sm:w-64 pt-5 flex flex-col gap-1 text-sm font-medium text-gray-600">
          {aToken && (
            <>
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-3 py-3.5 px-4 sm:px-7 cursor-pointer transition-colors ${
                    isActive ? 'bg-[#F2F3FF] border-r-4 border-primary text-primary font-bold' : 'hover:bg-gray-50'
                  }`
                }
              >
                <span className="text-lg">📊</span>
                <p className="hidden sm:inline">Dashboard</p>
              </NavLink>

              <NavLink
                to="/admin/all-appointments"
                className={({ isActive }) =>
                  `flex items-center gap-3 py-3.5 px-4 sm:px-7 cursor-pointer transition-colors ${
                    isActive ? 'bg-[#F2F3FF] border-r-4 border-primary text-primary font-bold' : 'hover:bg-gray-50'
                  }`
                }
              >
                <span className="text-lg">📅</span>
                <p className="hidden sm:inline">Appointments</p>
              </NavLink>

              <NavLink
                to="/admin/add-doctor"
                className={({ isActive }) =>
                  `flex items-center gap-3 py-3.5 px-4 sm:px-7 cursor-pointer transition-colors ${
                    isActive ? 'bg-[#F2F3FF] border-r-4 border-primary text-primary font-bold' : 'hover:bg-gray-50'
                  }`
                }
              >
                <span className="text-lg">➕</span>
                <p className="hidden sm:inline">Add Doctor</p>
              </NavLink>

              <NavLink
                to="/admin/doctor-list"
                className={({ isActive }) =>
                  `flex items-center gap-3 py-3.5 px-4 sm:px-7 cursor-pointer transition-colors ${
                    isActive ? 'bg-[#F2F3FF] border-r-4 border-primary text-primary font-bold' : 'hover:bg-gray-50'
                  }`
                }
              >
                <span className="text-lg">👥</span>
                <p className="hidden sm:inline">Doctors List</p>
              </NavLink>
            </>
          )}

          {dToken && (
            <>
              <NavLink
                to="/admin/doctor-dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-3 py-3.5 px-4 sm:px-7 cursor-pointer transition-colors ${
                    isActive ? 'bg-[#F2F3FF] border-r-4 border-primary text-primary font-bold' : 'hover:bg-gray-50'
                  }`
                }
              >
                <span className="text-lg">📈</span>
                <p className="hidden sm:inline">Dashboard</p>
              </NavLink>

              <NavLink
                to="/admin/doctor-appointments"
                className={({ isActive }) =>
                  `flex items-center gap-3 py-3.5 px-4 sm:px-7 cursor-pointer transition-colors ${
                    isActive ? 'bg-[#F2F3FF] border-r-4 border-primary text-primary font-bold' : 'hover:bg-gray-50'
                  }`
                }
              >
                <span className="text-lg">📋</span>
                <p className="hidden sm:inline">Appointments</p>
              </NavLink>

              <NavLink
                to="/admin/doctor-profile"
                className={({ isActive }) =>
                  `flex items-center gap-3 py-3.5 px-4 sm:px-7 cursor-pointer transition-colors ${
                    isActive ? 'bg-[#F2F3FF] border-r-4 border-primary text-primary font-bold' : 'hover:bg-gray-50'
                  }`
                }
              >
                <span className="text-lg">👤</span>
                <p className="hidden sm:inline">Profile</p>
              </NavLink>
            </>
          )}
        </div>

        {/* Dynamic Nested Content View */}
        <div className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-7xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
