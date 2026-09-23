import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export interface DashboardNavbarProps {
  currentRole: 'PATIENT' | 'DOCTOR' | 'ADMIN_HOSPITAL' | 'DRIVER' | 'SUPER_ADMIN';
  userName?: string;
  userSubtitle?: string;
  avatarUrl?: string;
}

export const DashboardNavbar: React.FC<DashboardNavbarProps> = ({
  currentRole,
  userName = 'User',
  userSubtitle = 'Active Session',
  avatarUrl = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
}) => {
  const navigate = useNavigate();
  const { setToken, setDToken, setAToken } = useApp();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const handleLogout = () => {
    setToken('');
    setDToken('');
    setAToken('');
    localStorage.removeItem('token');
    localStorage.removeItem('dToken');
    localStorage.removeItem('aToken');
    navigate('/login');
  };

  const roleMeta: Record<
    DashboardNavbarProps['currentRole'],
    { label: string; badgeColor: string; icon: string }
  > = {
    PATIENT: { label: 'Patient Portal', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200', icon: '👤' },
    DOCTOR: { label: 'Doctor Workspace', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: '👨‍⚕️' },
    ADMIN_HOSPITAL: { label: 'Hospital Admin', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '🏥' },
    DRIVER: { label: 'Ambulance Driver', badgeColor: 'bg-red-50 text-red-700 border-red-200', icon: '🚑' },
    SUPER_ADMIN: { label: 'Super Admin Root', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200', icon: '👑' },
  };

  const currentMeta = roleMeta[currentRole] || roleMeta.PATIENT;

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand & Role Tag */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-1.5 group">
            <span className="text-2xl font-black tracking-tight text-[#1e2e6e] group-hover:opacity-90 transition-opacity">
              b<span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full mx-0.5"></span>well
            </span>
          </Link>

          <span
            className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${currentMeta.badgeColor}`}
          >
            <span>{currentMeta.icon}</span>
            <span>{currentMeta.label}</span>
          </span>
        </div>

        {/* Right Section: Role Switcher, Profile, and Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 1-Click Role Switcher Dropdown (User Friendly) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-semibold border border-slate-200 hover:border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Quickly switch to another role's dashboard"
            >
              <span>🎛️</span>
              <span className="hidden md:inline">Switch Role</span>
              <span className="text-[10px] text-gray-400">▾</span>
            </button>

            {showRoleSwitcher && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-fadeIn"
                onMouseLeave={() => setShowRoleSwitcher(false)}
              >
                <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Switch Dashboard
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowRoleSwitcher(false);
                    navigate('/patient/dashboard');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                    currentRole === 'PATIENT' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-slate-50'
                  }`}
                >
                  <span>👤</span> Patient Dashboard
                </button>
                <button
                  onClick={() => {
                    setShowRoleSwitcher(false);
                    navigate('/doctor/dashboard');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                    currentRole === 'DOCTOR' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-slate-50'
                  }`}
                >
                  <span>👨‍⚕️</span> Doctor Workspace
                </button>
                <button
                  onClick={() => {
                    setShowRoleSwitcher(false);
                    navigate('/hospital/dashboard');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                    currentRole === 'ADMIN_HOSPITAL' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-slate-50'
                  }`}
                >
                  <span>🏥</span> Hospital Admin Desk
                </button>
                <button
                  onClick={() => {
                    setShowRoleSwitcher(false);
                    navigate('/driver/dashboard');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                    currentRole === 'DRIVER' ? 'bg-red-50 text-red-700' : 'text-gray-700 hover:bg-slate-50'
                  }`}
                >
                  <span>🚑</span> Ambulance Driver
                </button>
                <button
                  onClick={() => {
                    setShowRoleSwitcher(false);
                    navigate('/super-admin/dashboard');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                    currentRole === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-slate-50'
                  }`}
                >
                  <span>👑</span> Super Admin Console
                </button>
              </div>
            )}
          </div>

          {/* User Profile Info */}
          <div className="flex items-center gap-2">
            <img
              src={avatarUrl}
              alt={userName}
              className="w-8 h-8 rounded-full object-cover border border-gray-200"
            />
            <div className="hidden lg:block text-left leading-tight">
              <p className="text-xs font-bold text-gray-900">{userName}</p>
              <p className="text-[10px] text-gray-400 font-medium">{userSubtitle}</p>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardNavbar;
