import React from 'react';

interface KpiCardsProps {
  total: number;
  pending: number;
  sent: number;
  failed: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  total,
  pending,
  sent,
  failed,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-xs font-medium text-slate-500 dark:text-zinc-400">
          Total Notifications
        </div>
        <div className="text-2xl font-bold text-slate-900 dark:text-zinc-50 mt-1">
          {total}
        </div>
      </div>
      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 shadow-xs dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="text-xs font-medium text-amber-700 dark:text-amber-400">
          Pending / Scheduled
        </div>
        <div className="text-2xl font-bold text-amber-900 dark:text-amber-300 mt-1">
          {pending}
        </div>
      </div>
      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          Delivered
        </div>
        <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-300 mt-1">
          {sent}
        </div>
      </div>
      <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 shadow-xs dark:border-rose-900/50 dark:bg-rose-950/20">
        <div className="text-xs font-medium text-rose-700 dark:text-rose-400">
          Failed / Retrying
        </div>
        <div className="text-2xl font-bold text-rose-900 dark:text-rose-300 mt-1">
          {failed}
        </div>
      </div>
    </div>
  );
};

