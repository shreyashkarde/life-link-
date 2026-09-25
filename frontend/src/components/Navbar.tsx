import React, { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { assets } from '../assets/assets';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { token, aToken, dToken, userData, doctorData, logoutAll } = useApp();
  const [showMenu, setShowMenu] = useState(false);

  const isAuth = Boolean(token || dToken);
  const userRole = dToken ? 'DOCTOR' : (sessionStorage.getItem('role') || 'PATIENT');

  const getDashboardPath = () => {
    if (dToken) return '/doctor/dashboard';
    if (userRole === 'DRIVER') return '/driver/dashboard';
    return '/patient/dashboard';
  };

  const getDashboardLabel = () => {
    if (dToken) return 'DOCTOR WORKSPACE';
    if (userRole === 'DRIVER') return 'AMBULANCE DESK';
    return 'PATIENT DASHBOARD';
  };

  const logout = () => {
    logoutAll();
    navigate('/login');
  };

  return (
    <div className="flex items-center justify-between text-sm py-3 sm:py-4 mb-4 sm:mb-5 border-b border-gray-200">
      {/* Brand Logo */}
      <Link to={isAuth ? getDashboardPath() : "/login"} className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group">
        <img
          src="/lifelink_logo.png"
          alt="LifeLink Logo"
          className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-full shadow-xs group-hover:scale-105 transition-transform"
        />
        <div className="flex flex-col">
          <span className="text-lg sm:text-2xl font-black tracking-tight text-gray-900 group-hover:opacity-90 transition-opacity flex items-center leading-none">
            <span className="text-blue-600">Life</span>Link
          </span>
          <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest hidden xs:inline -mt-0.5">
            HEALTHCARE
          </span>
        </div>
      </Link>

      {/* Desktop Navigation Links */}
      <ul className="hidden md:flex items-center gap-5 lg:gap-7 font-semibold text-gray-700 text-xs tracking-wider">
        {isAuth && (
          <NavLink to={getDashboardPath()} className={({ isActive }) => `py-1 transition-colors ${isActive ? 'text-primary font-bold' : 'hover:text-primary'}`}>
            <li>{getDashboardLabel()}</li>
          </NavLink>
        )}
        <NavLink to="/doctors" className={({ isActive }) => `py-1 transition-colors ${isActive ? 'text-primary font-bold' : 'hover:text-primary'}`}>
          <li>ALL DOCTORS</li>
        </NavLink>
        <NavLink to="/nearby-hospitals" className={({ isActive }) => `py-1 transition-colors ${isActive ? 'text-primary font-bold' : 'hover:text-primary'}`}>
          <li>NEARBY HOSPITALS</li>
        </NavLink>
        {token && (
          <NavLink to="/my-appointments" className={({ isActive }) => `py-1 transition-colors ${isActive ? 'text-primary font-bold' : 'hover:text-primary'}`}>
            <li>MY APPOINTMENTS</li>
          </NavLink>
        )}
        <NavLink to="/about" className={({ isActive }) => `py-1 transition-colors ${isActive ? 'text-primary font-bold' : 'hover:text-primary'}`}>
          <li>ABOUT</li>
        </NavLink>
        <NavLink to="/contact" className={({ isActive }) => `py-1 transition-colors ${isActive ? 'text-primary font-bold' : 'hover:text-primary'}`}>
          <li>CONTACT</li>
        </NavLink>
      </ul>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {isAuth ? (
          <div className="flex items-center gap-2 cursor-pointer group relative">
            <img
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-primary shadow-sm"
              src={userData?.image || doctorData?.image || assets.profile_pic}
              alt="Profile"
            />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-gray-800 leading-tight">
                {doctorData?.name || userData?.name || (dToken ? 'Dr. Richard James' : aToken ? 'Hospital Admin' : 'Edward Vincent')}
              </p>
              <p className="text-[10px] text-gray-500 font-medium capitalize">{userRole.toLowerCase()}</p>
            </div>
            <svg
              className="w-3.5 h-3.5 text-gray-500 transition-transform group-hover:rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>

            {/* Dropdown Menu */}
            <div className="absolute top-0 right-0 pt-12 sm:pt-14 text-sm font-medium text-gray-700 z-30 hidden group-hover:block">
              <div className="min-w-56 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col gap-1 p-3">
                <button
                  onClick={() => navigate(getDashboardPath())}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 text-blue-700 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span>🎛️</span> {getDashboardLabel()}
                </button>
                {token && (
                  <>
                    <button
                      onClick={() => navigate('/my-profile')}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 hover:text-primary flex items-center gap-2 transition-colors font-medium cursor-pointer"
                    >
                      <span>👤</span> My Profile
                    </button>
                    <button
                      onClick={() => navigate('/my-appointments')}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 hover:text-primary flex items-center gap-2 transition-colors font-medium cursor-pointer"
                    >
                      <span>📅</span> My Appointments
                    </button>
                  </>
                )}
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-50 text-rose-600 font-bold flex items-center gap-2 transition-colors border-t border-gray-100 mt-1 cursor-pointer"
                >
                  <span>🚪</span> Logout
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="bg-primary hover:bg-[#4a58eb] text-white px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-all shadow-md hover:shadow-primary/40 active:scale-95 cursor-pointer"
          >
            <span>Login / Sign Up</span>
            <span>→</span>
          </button>
        )}

        {/* Mobile Hamburger Menu Icon */}
        <button
          onClick={() => setShowMenu(true)}
          className="w-8 h-8 md:hidden flex items-center justify-center text-gray-700 focus:outline-none"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>

        {/* Mobile Menu Drawer */}
        {showMenu && (
          <div className="fixed inset-0 z-50 bg-white p-6 flex flex-col md:hidden">
            <div className="flex items-center justify-between pb-6 border-b">
              <div className="flex items-center gap-2.5">
                <img
                  src="/lifelink_logo.png"
                  alt="LifeLink Logo"
                  className="w-8 h-8 object-contain rounded-full"
                />
                <div className="flex flex-col">
                  <span className="text-xl font-black tracking-tight text-gray-900 flex items-center leading-none">
                    <span className="text-blue-600">Life</span>Link
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    HEALTHCARE
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowMenu(false)}
                className="p-2 text-gray-500 hover:text-black text-xl"
              >
                ✕
              </button>
            </div>
            <ul className="flex flex-col gap-3 mt-6 text-base font-semibold">
              {isAuth && (
                <NavLink onClick={() => setShowMenu(false)} to={getDashboardPath()}>
                  <p className="px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center gap-2">
                    <span>🎛️</span> {getDashboardLabel()}
                  </p>
                </NavLink>
              )}
              <NavLink onClick={() => setShowMenu(false)} to="/doctors">
                <p className="px-4 py-2 hover:bg-gray-50 rounded-xl">ALL DOCTORS</p>
              </NavLink>
              <NavLink onClick={() => setShowMenu(false)} to="/nearby-hospitals">
                <p className="px-4 py-2 hover:bg-gray-50 rounded-xl">NEARBY HOSPITALS</p>
              </NavLink>
              {token && (
                <NavLink onClick={() => setShowMenu(false)} to="/my-appointments">
                  <p className="px-4 py-2 hover:bg-gray-50 rounded-xl">MY APPOINTMENTS</p>
                </NavLink>
              )}
              <NavLink onClick={() => setShowMenu(false)} to="/about">
                <p className="px-4 py-2 hover:bg-gray-50 rounded-xl">ABOUT</p>
              </NavLink>
              <NavLink onClick={() => setShowMenu(false)} to="/contact">
                <p className="px-4 py-2 hover:bg-gray-50 rounded-xl">CONTACT</p>
              </NavLink>
            </ul>
            <div className="mt-auto pb-6">
              {!isAuth ? (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    navigate('/login');
                  }}
                  className="w-full bg-primary text-white py-3 rounded-full font-bold shadow-md cursor-pointer"
                >
                  Login / Sign Up
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    logout();
                  }}
                  className="w-full bg-rose-50 text-rose-600 border border-rose-200 py-3 rounded-full font-bold cursor-pointer"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
