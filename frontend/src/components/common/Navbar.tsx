import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, LogOut, ShieldAlert, Sparkles } from 'lucide-react';
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
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-surface-100 px-6 py-3.5 transition-all">
      <div className="flex items-center justify-between">
        {/* Brand / Title for Mobile */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-soft">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-surface-900">LifeLink</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-surface-500 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Real-time Emergency & Healthcare Network</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Live Notification Indicator */}
          <button
            title="Notifications"
            className="relative p-2 rounded-xl text-surface-500 hover:bg-surface-50 hover:text-surface-700 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full animate-ping" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />
          </button>

          {/* User Profile dropdown/pill */}
          {user ? (
            <div className="flex items-center gap-3 pl-3 border-l border-surface-100">
              <img
                src={
                  user.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563EB&color=fff`
                }
                alt={user.name}
                className="w-9 h-9 rounded-xl object-cover border border-surface-200 shadow-xs"
              />
              <div className="hidden md:block text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-surface-900">{user.name}</span>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {user.role.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-[11px] text-surface-400">{user.email}</p>
              </div>

              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-xl text-surface-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
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
