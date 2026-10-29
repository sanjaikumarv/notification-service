import React from 'react';

const STATUSES = ['ALL', 'PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED'];

interface FilterToolbarProps {
  currentStatus: string;
  onSelectStatus: (status: string) => void;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  currentStatus,
  onSelectStatus,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Status Filter:
        </span>
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((st) => (
            <button
              key={st}
              onClick={() => onSelectStatus(st)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                currentStatus === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

