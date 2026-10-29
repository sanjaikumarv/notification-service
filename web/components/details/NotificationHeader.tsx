import React from 'react';
import Link from 'next/link';
import { ScheduledNotification } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';

interface NotificationHeaderProps {
  notification: ScheduledNotification;
  loading: boolean;
  actionLoading: boolean;
  onRefresh: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

export const NotificationHeader: React.FC<NotificationHeaderProps> = ({
  notification,
  loading,
  actionLoading,
  onRefresh,
  onCancel,
  onRetry,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <Link
          href="/"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 inline-flex items-center gap-1 mb-2 dark:text-indigo-400"
        >
          ← Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            {notification.title}
          </h1>
          <StatusBadge status={notification.status} />
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-mono">
          UUID: {notification.id}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={loading || actionLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition"
        >
          <svg
            className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>

        {notification.status === 'PENDING' && (
          <button
            onClick={onCancel}
            disabled={actionLoading}
            className="px-3.5 py-2 text-sm font-semibold rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40 transition disabled:opacity-50"
          >
            Cancel Notification
          </button>
        )}

        {notification.status === 'FAILED' && (
          <button
            onClick={onRetry}
            disabled={actionLoading}
            className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm transition disabled:opacity-50"
          >
            Retry Failed Deliveries
          </button>
        )}
      </div>
    </div>
  );
};

