import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  size = 'md',
}) => {
  const normalized = status.toUpperCase();
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';

  switch (normalized) {
    case 'PENDING':
      colorClasses =
        'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      break;
    case 'PROCESSING':
    case 'RETRYING':
      colorClasses =
        'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
      break;
    case 'SENT':
    case 'SUCCESS':
      colorClasses =
        'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      break;
    case 'FAILED':
      colorClasses =
        'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      break;
    case 'CANCELLED':
      colorClasses =
        'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${padding} ${colorClasses} ${className}`}
    >
      {normalized === 'PROCESSING' || normalized === 'RETRYING' ? (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
      ) : (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            normalized === 'SENT' || normalized === 'SUCCESS'
              ? 'bg-emerald-500'
              : normalized === 'PENDING'
                ? 'bg-amber-500'
                : normalized === 'FAILED'
                  ? 'bg-rose-500'
                  : 'bg-zinc-400'
          }`}
        />
      )}
      {normalized}
    </span>
  );
};

