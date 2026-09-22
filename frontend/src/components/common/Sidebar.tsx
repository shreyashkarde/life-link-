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
  Radio,
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
    <aside className="w-64 bg-white/95 backdrop-blur-xl border-r border-surface-200/80 flex flex-col justify-between min-h-screen py-6 px-4 shrink-0 transition-all shadow-xs">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-soft ring-2 ring-blue-600/20">
            <HeartPulse className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tight text-surface-900 leading-tight">
              LifeLink<span className="text-blue-600">.</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">
                Smart Healthcare
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          <p className="px-3 text-[10px] font-extrabold text-surface-400 uppercase tracking-widest mb-2.5">
            Main Navigation
          </p>
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-soft font-bold shadow-glow-blue'
                      : 'text-surface-600 hover:bg-surface-100/70 hover:text-blue-600'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-surface-400 group-hover:text-blue-600'
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Card & Logout */}
      <div className="space-y-3 pt-4 border-t border-surface-200/80">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50 via-cyan-50/30 to-indigo-50/50 border border-blue-100/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-xs mb-1">
            <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>Emergency Telemetry</span>
          </div>
          <p className="text-[11px] text-surface-600 leading-relaxed font-medium">
            Live GPS dispatch & real-time hospital bed sync active.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-surface-600 hover:text-rose-600 hover:bg-rose-50 border border-surface-200/80 transition-all hover:border-rose-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
