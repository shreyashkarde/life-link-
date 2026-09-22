import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
}) => {
  const colorMap = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/60',
      iconText: 'text-blue-600',
      border: 'border-blue-200/60',
      glow: 'group-hover:shadow-glow-blue',
      sheen: 'from-blue-500/5 to-transparent',
    },
    cyan: {
      bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100/60',
      iconText: 'text-cyan-600',
      border: 'border-cyan-200/60',
      glow: 'group-hover:shadow-glow-cyan',
      sheen: 'from-cyan-500/5 to-transparent',
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/60',
      iconText: 'text-emerald-600',
      border: 'border-emerald-200/60',
      glow: 'group-hover:shadow-emerald-500/20',
      sheen: 'from-emerald-500/5 to-transparent',
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100/60',
      iconText: 'text-amber-600',
      border: 'border-amber-200/60',
      glow: 'group-hover:shadow-amber-500/20',
      sheen: 'from-amber-500/5 to-transparent',
    },
    rose: {
      bg: 'bg-gradient-to-br from-rose-50 to-rose-100/60',
      iconText: 'text-rose-600',
      border: 'border-rose-200/60',
      glow: 'group-hover:shadow-glow-rose',
      sheen: 'from-rose-500/5 to-transparent',
    },
    indigo: {
      bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/60',
      iconText: 'text-indigo-600',
      border: 'border-indigo-200/60',
      glow: 'group-hover:shadow-indigo-500/20',
      sheen: 'from-indigo-500/5 to-transparent',
    },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className="glass-card rounded-2xl p-5 border border-surface-200/80 shadow-luxury glass-card-hover group relative overflow-hidden">
      {/* Subtle decorative gradient glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${scheme.sheen} pointer-events-none rounded-bl-full transition-all duration-300 group-hover:scale-110`} />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider block">
            {title}
          </span>
          <h3 className="text-2xl font-black text-surface-900 tracking-tight mt-1">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-surface-500 mt-1 font-medium">{subtitle}</p>
          )}
        </div>

        <div
          className={`p-3 rounded-2xl border ${scheme.bg} ${scheme.border} ${scheme.iconText} transition-all duration-300 ${scheme.glow} shadow-sm group-hover:scale-105`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-4 pt-3 border-t border-surface-100 flex items-center gap-2 text-xs relative z-10">
          <span
            className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full ${
              trend.isPositive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                : 'bg-rose-50 text-rose-700 border border-rose-200/80'
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend.value}
          </span>
          <span className="text-surface-400 font-medium text-[11px]">vs last period</span>
        </div>
      )}
    </div>
  );
};
