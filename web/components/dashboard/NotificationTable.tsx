import React from 'react';
import Link from 'next/link';
import { ScheduledNotification } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { ChannelIcon } from '@/components/ChannelIcon';
import { formatDateTime } from '@/lib/date';

interface NotificationTableProps {
  notifications: ScheduledNotification[];
  loading: boolean;
  statusFilter: string;
  actionLoadingId: string | null;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}

export const NotificationTable: React.FC<NotificationTableProps> = ({
  notifications,
  loading,
  statusFilter,
  actionLoadingId,
  onCancel,
  onRetry,
}) => {
  if (loading && notifications.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-zinc-400">
        <div className="w-8 h-8 mx-auto border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        Loading scheduled notifications...
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 dark:bg-zinc-800">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-zinc-100">
          No notifications found
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          {statusFilter !== 'ALL'
            ? `No notifications with status "${statusFilter}"`
            : 'Get started by scheduling your first notification.'}
        </p>
        <div className="mt-6">
          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm"
          >
            + Schedule Notification
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
          <tr>
            <th className="px-6 py-3.5">Notification</th>
            <th className="px-6 py-3.5">Scheduled For</th>
            <th className="px-6 py-3.5">Status</th>
            <th className="px-6 py-3.5">Channel Deliveries</th>
            <th className="px-6 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
          {notifications.map((notif) => {
            const { formatted, isFuture } = formatDateTime(notif.scheduled_at);
            const isActing = actionLoadingId === notif.id;

            return (
              <tr key={notif.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                <td className="px-6 py-4">
                  <Link
                    href={`/notifications/${notif.id}`}
                    className="font-semibold text-slate-900 hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-400 block"
                  >
                    {notif.title}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                    {notif.body}
                  </p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-slate-900 dark:text-zinc-100">{formatted}</div>
                  <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                    <span>{notif.timezone}</span>
                    {isFuture && notif.status === 'PENDING' && (
                      <span className="text-amber-600 dark:text-amber-400">• future</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={notif.status} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {notif.deliveries?.map((del) => (
                      <div
                        key={del.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800"
                        title={`${del.channel}: ${del.recipient}`}
                      >
                        <ChannelIcon channel={del.channel} className="w-3 h-3 text-slate-500" />
                        <span className="font-medium text-[11px]">{del.channel}</span>
                        <StatusBadge status={del.status} size="sm" />
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/notifications/${notif.id}`}
                      className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                    >
                      Details
                    </Link>
                    {notif.status === 'PENDING' && (
                      <button
                        onClick={() => onCancel(notif.id)}
                        disabled={isActing}
                        className="px-2.5 py-1 text-xs font-medium rounded border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 disabled:opacity-50 transition"
                      >
                        {isActing ? '...' : 'Cancel'}
                      </button>
                    )}
                    {notif.status === 'FAILED' && (
                      <button
                        onClick={() => onRetry(notif.id)}
                        disabled={isActing}
                        className="px-2.5 py-1 text-xs font-medium rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 disabled:opacity-50 transition"
                      >
                        {isActing ? '...' : 'Retry'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

