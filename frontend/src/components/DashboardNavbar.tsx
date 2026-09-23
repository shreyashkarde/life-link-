import React from 'react';
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
  const { logoutAll } = useApp();

  const handleLogout = () => {
    logoutAll();
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

  const getDashboardHome = () => {
    switch (currentRole) {
      case 'DOCTOR':
        return '/doctor/dashboard';
      case 'ADMIN_HOSPITAL':
        return '/hospital/dashboard';
      case 'DRIVER':
        return '/driver/dashboard';
      case 'SUPER_ADMIN':
        return '/admin/dashboard';
      case 'PATIENT':
      default:
        return '/patient/dashboard';
    }
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand & Role Tag */}
        <div className="flex items-center gap-3">
          <Link to={getDashboardHome()} className="flex items-center gap-1.5 group">
            <span className="text-2xl font-black tracking-tight text-gray-900 group-hover:opacity-90 transition-opacity flex items-center">
              <span className="text-blue-600">Life</span>Link<span className="inline-block w-2 h-2 bg-blue-600 rounded-full ml-1"></span>
            </span>
          </Link>

          <span
            className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${currentMeta.badgeColor}`}
          >
            <span>{currentMeta.icon}</span>
            <span>{currentMeta.label}</span>
          </span>
        </div>

        {/* Right Section: Profile and Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
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

