import React from 'react';
import { ScheduledNotification, NotificationDelivery } from '@/lib/api';
import { formatDate } from '@/lib/date';

interface NotificationMetaProps {
  notification: ScheduledNotification;
  deliveries: NotificationDelivery[];
}

export const NotificationMeta: React.FC<NotificationMetaProps> = ({
  notification,
  deliveries,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <div className="text-xs font-medium text-slate-500 dark:text-zinc-400">
          Scheduled Time
        </div>
        <div className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mt-1">
          {formatDate(notification.scheduled_at)}
        </div>
        <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          Timezone:{' '}
          <span className="font-medium text-slate-700 dark:text-zinc-300">
            {notification.timezone}
          </span>
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-slate-500 dark:text-zinc-400">
          Created At
        </div>
        <div className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mt-1">
          {formatDate(notification.created_at)}
        </div>
        <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          Updated: {formatDate(notification.updated_at)}
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-slate-500 dark:text-zinc-400">
          Total Delivery Channels
        </div>
        <div className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mt-1">
          {deliveries.length} Channel(s)
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {deliveries.map((d) => (
            <span
              key={d.id}
              className="text-[11px] px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 font-medium dark:border-zinc-700 dark:bg-zinc-800"
            >
              {d.channel}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

