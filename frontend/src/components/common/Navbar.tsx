import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, LogOut, HeartPulse, Activity, ShieldCheck } from 'lucide-react';
import { Badge } from './Badge';

interface NavbarProps {
  toggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { user, logout } = useAuth();

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'danger';
      case 'ADMIN_HOSPITAL':
        return 'warning';
      case 'DOCTOR':
        return 'success';
      case 'DRIVER':
        return 'primary';
      default:
        return 'neutral';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-surface-200/80 px-6 py-3.5 transition-all shadow-xs">
      <div className="flex items-center justify-between">
        {/* Brand / Title for Mobile & System Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 md:hidden">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-soft">
              <HeartPulse className="w-5 h-5 animate-pulse" />
            </div>
            <span className="font-black text-lg tracking-tight text-surface-900">
              LifeLink<span className="text-blue-600">.</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-100/80 border border-surface-200/80 text-xs text-surface-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-[11px] text-surface-700">
              Grid Active: <span className="text-surface-900 font-bold">Mumbai Metro Emergency Network</span>
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3.5">
          {/* Live Notification Indicator */}
          <button
            title="Notifications"
            className="relative p-2.5 rounded-xl text-surface-500 hover:bg-surface-100/80 hover:text-surface-800 transition-all border border-transparent hover:border-surface-200"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full animate-ping" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full" />
          </button>

          {/* User Profile dropdown/pill */}
          {user ? (
            <div className="flex items-center gap-3 pl-3.5 border-l border-surface-200/80">
              <div className="relative">
                <img
                  src={
                    user.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563EB&color=fff&bold=true`
                  }
                  alt={user.name}
                  className="w-9 h-9 rounded-2xl object-cover ring-2 ring-blue-600/20 shadow-xs"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>

              <div className="hidden md:block text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-surface-900 leading-none">{user.name}</span>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {user.role.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-[11px] text-surface-400 font-medium mt-0.5">{user.email}</p>
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 rounded-xl text-surface-400 hover:text-rose-600 hover:bg-rose-50 transition-all ml-1 border border-transparent hover:border-rose-100"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
