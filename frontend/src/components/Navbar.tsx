import React, { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { assets } from '../assets/assets';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { token, aToken, dToken, userData, doctorData, logoutAll } = useApp();
  const [showMenu, setShowMenu] = useState(false);

  const isAuth = Boolean(token || dToken || aToken);
  const userRole = dToken ? 'DOCTOR' : aToken ? 'ADMIN' : (sessionStorage.getItem('role') || 'PATIENT');

  const getDashboardPath = () => {
    if (dToken) return '/doctor/dashboard';
    if (aToken) return '/admin/dashboard';
    if (userRole === 'DRIVER') return '/driver/dashboard';
    return '/patient/dashboard';
  };

  const getDashboardLabel = () => {
    if (dToken) return 'Doctor Portal';
    if (aToken) return 'Admin Desk';
    if (userRole === 'DRIVER') return 'Ambulance Hub';
    return 'Patient Dashboard';
  };

  const logout = () => {
    logoutAll();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full mb-4 sm:mb-6 transition-all duration-300">
      <div className="glass-panel rounded-2xl px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between shadow-sm border border-slate-200/80">
        {/* Brand Logo */}
        <Link to={isAuth ? getDashboardPath() : "/"} className="flex items-center gap-2.5 cursor-pointer group">
          <div className="relative">
            <img
              src="/lifelink_logo.png"
              alt="LifeLink Logo"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-xl shadow-xs group-hover:scale-105 transition-transform"
            />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white"></span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors flex items-center leading-none">
              Life<span className="text-blue-600">Link</span>
            </span>
            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Smart Healthcare & SOS
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 font-medium text-slate-600 text-xs sm:text-sm">
          {isAuth && (
            <NavLink
              to={getDashboardPath()}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 ${
                  isActive ? 'bg-blue-50 text-blue-600 font-bold shadow-xs' : 'hover:bg-slate-100/80 hover:text-slate-900'
                }`
              }
            >
              <span>🎛️</span>
              <span>{getDashboardLabel()}</span>
            </NavLink>
          )}
          <NavLink
            to="/doctors"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg transition-all ${
                isActive ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-slate-100/80 hover:text-slate-900'
              }`
            }
          >
            Doctors
          </NavLink>
          <NavLink
            to="/nearby-hospitals"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg transition-all ${
                isActive ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-slate-100/80 hover:text-slate-900'
              }`
            }
          >
            Hospitals
          </NavLink>
          {token && (
            <NavLink
              to="/my-appointments"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg transition-all ${
                  isActive ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-slate-100/80 hover:text-slate-900'
                }`
              }
            >
              Appointments
            </NavLink>
          )}
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg transition-all ${
                isActive ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-slate-100/80 hover:text-slate-900'
              }`
            }
          >
            About
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg transition-all ${
                isActive ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-slate-100/80 hover:text-slate-900'
              }`
            }
          >
            Contact
          </NavLink>
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isAuth ? (
            <div className="flex items-center gap-2.5 cursor-pointer group relative">
              <div className="relative">
                <img
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-blue-500/30 shadow-xs group-hover:ring-blue-500 transition-all"
                  src={userData?.image || doctorData?.image || assets.profile_pic}
                  alt="Profile"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {doctorData?.name || userData?.name || (dToken ? 'Dr. Richard James' : aToken ? 'Hospital Admin' : 'Edward Vincent')}
                </p>
                <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">{userRole}</p>
              </div>
              <svg
                className="w-4 h-4 text-slate-400 transition-transform group-hover:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>

              {/* Dropdown Menu */}
              <div className="absolute top-full right-0 pt-2 text-sm font-medium text-slate-700 z-50 hidden group-hover:block transition-all">
                <div className="min-w-60 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100 flex flex-col gap-1 p-2.5 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {doctorData?.name || userData?.name || 'User Profile'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{userData?.email || 'patient@prescripto.com'}</p>
                  </div>
                  <button
                    onClick={() => navigate(getDashboardPath())}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 text-blue-600 font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>🎛️</span> {getDashboardLabel()}
                  </button>
                  {token && (
                    <>
                      <button
                        onClick={() => navigate('/my-profile')}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                      >
                        <span>👤</span> My Profile
                      </button>
                      <button
                        onClick={() => navigate('/my-appointments')}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                      >
                        <span>📅</span> My Appointments
                      </button>
                    </>
                  )}
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 font-semibold flex items-center gap-2 transition-colors border-t border-slate-100 mt-1 cursor-pointer"
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>Get Started</span>
              <span>→</span>
            </button>
          )}

          {/* Mobile Hamburger Menu Icon */}
          <button
            onClick={() => setShowMenu(true)}
            className="w-9 h-9 md:hidden flex items-center justify-center text-slate-700 rounded-lg hover:bg-slate-100 focus:outline-none cursor-pointer"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {showMenu && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex justify-end md:hidden">
          <div className="w-4/5 max-w-sm bg-white h-full p-6 flex flex-col shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <img src="/lifelink_logo.png" alt="LifeLink" className="w-7 h-7 object-contain rounded-lg" />
                <span className="text-lg font-black text-slate-900">Life<span className="text-blue-600">Link</span></span>
              </div>
              <button
                onClick={() => setShowMenu(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <ul className="flex flex-col gap-2 mt-5 text-sm font-semibold text-slate-700">
              {isAuth && (
                <NavLink onClick={() => setShowMenu(false)} to={getDashboardPath()}>
                  <li className="px-3.5 py-2.5 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center gap-2">
                    <span>🎛️</span> {getDashboardLabel()}
                  </li>
                </NavLink>
              )}
              <NavLink onClick={() => setShowMenu(false)} to="/doctors">
                <li className="px-3.5 py-2.5 hover:bg-slate-50 rounded-xl">Doctors Catalog</li>
              </NavLink>
              <NavLink onClick={() => setShowMenu(false)} to="/nearby-hospitals">
                <li className="px-3.5 py-2.5 hover:bg-slate-50 rounded-xl">Nearby Hospitals & Trauma</li>
              </NavLink>
              {token && (
                <NavLink onClick={() => setShowMenu(false)} to="/my-appointments">
                  <li className="px-3.5 py-2.5 hover:bg-slate-50 rounded-xl">My Appointments</li>
                </NavLink>
              )}
              <NavLink onClick={() => setShowMenu(false)} to="/about">
                <li className="px-3.5 py-2.5 hover:bg-slate-50 rounded-xl">About LifeLink</li>
              </NavLink>
              <NavLink onClick={() => setShowMenu(false)} to="/contact">
                <li className="px-3.5 py-2.5 hover:bg-slate-50 rounded-xl">Contact & Support</li>
              </NavLink>
            </ul>
            <div className="mt-auto pt-6 border-t border-slate-100">
              {!isAuth ? (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    navigate('/login');
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Login / Sign Up
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    logout();
                  }}
                  className="w-full bg-rose-50 text-rose-600 border border-rose-200 py-2.5 rounded-xl font-bold cursor-pointer"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

