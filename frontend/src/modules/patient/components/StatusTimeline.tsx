import React from 'react';

export type RideStatusType =
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'EN_ROUTE_PICKUP'
  | 'PATIENT_PICKED'
  | 'PATIENT_ONBOARD'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

interface StatusTimelineProps {
  currentStatus: RideStatusType | string;
  className?: string;
  compact?: boolean;
}

interface TimelineStep {
  key: string;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    key: 'REQUESTED',
    label: 'Requested',
    shortLabel: 'Request',
    icon: '📡',
    description: 'Dispatch searching nearby fleet',
  },
  {
    key: 'ASSIGNED',
    label: 'Assigned',
    shortLabel: 'Assigned',
    icon: '🧑‍✈️',
    description: 'Paramedic driver allocated',
  },
  {
    key: 'ACCEPTED',
    label: 'Accepted',
    shortLabel: 'Accepted',
    icon: '✅',
    description: 'Driver confirmed & dispatched',
  },
  {
    key: 'EN_ROUTE',
    label: 'En Route',
    shortLabel: 'En Route',
    icon: '🚑',
    description: 'Rushing with priority sirens',
  },
  {
    key: 'PATIENT_PICKED',
    label: 'Onboard',
    shortLabel: 'Onboard',
    icon: '🧑‍🦽',
    description: 'Patient secured in ambulance',
  },
  {
    key: 'COMPLETED',
    label: 'Completed',
    shortLabel: 'Arrived',
    icon: '🏥',
    description: 'Admitted at trauma care bay',
  },
];

const getStepIndex = (status: string): number => {
  const norm = (status || 'REQUESTED').toUpperCase();
  if (norm === 'REQUESTED' || norm === 'PENDING') return 0;
  if (norm === 'ASSIGNED') return 1;
  if (norm === 'ACCEPTED') return 2;
  if (norm === 'EN_ROUTE' || norm === 'EN_ROUTE_PICKUP') return 3;
  if (norm === 'PATIENT_PICKED' || norm === 'PATIENT_ONBOARD') return 4;
  if (norm === 'COMPLETED') return 5;
  return 0;
};

export const StatusTimeline: React.FC<StatusTimelineProps> = ({
  currentStatus,
  className = '',
  compact = false,
}) => {
  const currentIndex = getStepIndex(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED' || currentStatus === 'REJECTED';

  if (isCancelled) {
    return (
      <div className={`p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center text-xs font-bold ${className}`}>
        ⚠️ This emergency dispatch mission was cancelled.
      </div>
    );
  }

  return (
    <div className={`w-full bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs ${className}`}>
      {/* Top Heading */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
          <span>📈</span>
          <span>Emergency Mission Timeline</span>
        </span>
        <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          Status: {TIMELINE_STEPS[currentIndex]?.label || currentStatus}
        </span>
      </div>

      {/* Stepper Progression Bar */}
      <div className="relative flex items-center justify-between w-full pt-2">
        {/* Background Track Line */}
        <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-100 -translate-y-1/2 rounded-full z-0" />

        {/* Active Track Line */}
        <div
          className="absolute top-1/2 left-4 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 -translate-y-1/2 rounded-full transition-all duration-500 z-0"
          style={{ width: `calc(${(currentIndex / (TIMELINE_STEPS.length - 1)) * 100}% - 2rem)` }}
        />

        {/* Step Nodes */}
        {TIMELINE_STEPS.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isUpcoming = idx > currentIndex;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center group">
              {/* Circle Node */}
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-black transition-all shadow-xs ${
                  isDone
                    ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                    : isCurrent
                    ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 shadow-lg scale-110'
                    : 'bg-white text-slate-400 border border-slate-200'
                }`}
              >
                {isDone ? '✓' : step.icon}
              </div>

              {/* Label */}
              <div className="text-center mt-1.5 min-w-[50px]">
                <p
                  className={`text-[10px] sm:text-[11px] font-black tracking-tight ${
                    isCurrent
                      ? 'text-blue-700 font-extrabold'
                      : isDone
                      ? 'text-slate-800'
                      : 'text-slate-400'
                  }`}
                >
                  {compact ? step.shortLabel : step.label}
                </p>
                {!compact && (
                  <p className="hidden md:block text-[9px] text-slate-400 font-medium line-clamp-1 max-w-[80px]">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusTimeline;
