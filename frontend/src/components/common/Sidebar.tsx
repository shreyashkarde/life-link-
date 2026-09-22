import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HeartPulse,
  Calendar,
  Truck,
  Activity,
  UserCheck,
  ShieldCheck,
  Clock,
  LogOut,
  Sparkles,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavLinks = () => {
    if (!user) return [];

    switch (user.role) {
      case 'PATIENT':
        return [
          { name: 'Patient Dashboard', path: '/patient', icon: HeartPulse },
          { name: 'Book Ambulance', path: '/patient?tab=ambulance', icon: Truck },
          { name: 'My Appointments', path: '/patient?tab=appointments', icon: Calendar },
          { name: 'Ride History', path: '/patient?tab=history', icon: Clock },
        ];
      case 'DOCTOR':
        return [
          { name: 'Doctor Dashboard', path: '/doctor', icon: Activity },
          { name: 'Appointments', path: '/doctor?tab=appointments', icon: Calendar },
          { name: 'Manage Slots', path: '/doctor?tab=slots', icon: Clock },
          { name: 'Doctor Profile', path: '/doctor?tab=profile', icon: UserCheck },
        ];
      case 'DRIVER':
        return [
          { name: 'Driver Dashboard', path: '/driver', icon: Truck },
          { name: 'Ride Management', path: '/driver?tab=rides', icon: Activity },
          { name: 'Trip History', path: '/driver?tab=history', icon: Clock },
        ];
      case 'ADMIN_HOSPITAL':
        return [
          { name: 'Hospital Overview', path: '/admin/hospital', icon: Activity },
          { name: 'Doctors Staff', path: '/admin/hospital?tab=doctors', icon: UserCheck },
          { name: 'Ambulance Fleet', path: '/admin/hospital?tab=fleet', icon: Truck },
          { name: 'Bed & ER Monitor', path: '/admin/hospital?tab=beds', icon: HeartPulse },
        ];
      case 'SUPER_ADMIN':
        return [
          { name: 'Global Analytics', path: '/admin/super', icon: ShieldCheck },
          { name: 'Users Management', path: '/admin/super?tab=users', icon: UserCheck },
          { name: 'Hospital Network', path: '/admin/super?tab=hospitals', icon: HeartPulse },
        ];
      default:
        return [{ name: 'Home', path: '/', icon: HeartPulse }];
    }
  };

  const navLinks = getNavLinks();

  return (
    <aside className="w-64 bg-white border-r border-surface-100 flex flex-col justify-between min-h-screen py-6 px-4 shrink-0 transition-all">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-blue-500 flex items-center justify-center text-white shadow-soft">
            <HeartPulse className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-surface-900 leading-tight">
              LifeLink<span className="text-blue-600">.</span>
            </h1>
            <p className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider">Smart Healthcare</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          <p className="px-3 text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-2">Main Menu</p>
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-soft font-bold'
                      : 'text-surface-600 hover:bg-surface-50 hover:text-blue-600'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Card & Logout */}
      <div className="space-y-3 pt-4 border-t border-surface-100">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100/60">
          <div className="flex items-center gap-2 text-blue-800 font-bold text-xs mb-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>24/7 Live Triage</span>
          </div>
          <p className="text-[11px] text-surface-500 leading-relaxed">
            Emergency GPS dispatch active across all network hospitals.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-surface-600 hover:text-rose-600 hover:bg-rose-50 border border-surface-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
