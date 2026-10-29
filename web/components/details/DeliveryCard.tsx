import React from 'react';
import { NotificationDelivery } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { ChannelIcon } from '@/components/ChannelIcon';
import { formatDate } from '@/lib/date';

interface DeliveryCardProps {
  delivery: NotificationDelivery;
  onRetry?: (deliveryId: string) => void;
  isRetrying?: boolean;
}

export const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  onRetry,
  isRetrying = false,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      {/* Delivery Channel Header */}
      <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 dark:border-zinc-800 dark:bg-zinc-800/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <ChannelIcon channel={delivery.channel} className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-zinc-100">
                {delivery.channel}
              </span>
              <StatusBadge status={delivery.status} size="sm" />
              {delivery.channel === 'PUSH' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                  MOCK PROVIDER
                </span>
              )}
            </div>
            <div className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
              Recipient: <span className="font-mono font-medium">{delivery.recipient}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="text-xs text-slate-500 dark:text-zinc-400 space-y-0.5 sm:text-right">
            <div>
              Attempts: <span className="font-semibold">{delivery.attempt_count}</span> / 4 max
            </div>
            {delivery.sent_at && (
              <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                Sent: {formatDate(delivery.sent_at)}
              </div>
            )}
            {delivery.next_retry_at && (
              <div className="text-amber-600 dark:text-amber-400 font-medium">
                Next Retry: {formatDate(delivery.next_retry_at)}
              </div>
            )}
          </div>
          {onRetry && delivery.status === 'FAILED' && (
            <button
              type="button"
              onClick={() => onRetry(delivery.id)}
              disabled={isRetrying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 transition-colors shadow-xs disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isRetrying ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin text-rose-600 dark:text-rose-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>Retrying...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Retry Channel</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Provider Metadata Banner */}
      <div className="p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-500 dark:text-zinc-400">Provider Message ID:</span>
            <div className="font-mono font-medium text-slate-800 dark:text-zinc-200 mt-0.5 break-all">
              {delivery.provider_message_id || '—'}
            </div>
          </div>

          {delivery.last_error && (
            <div>
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                Last Recorded Error:
              </span>
              <div className="font-mono text-rose-700 dark:text-rose-300 mt-0.5 bg-rose-50 dark:bg-rose-950/30 p-2 rounded border border-rose-200 dark:border-rose-900 break-words">
                {delivery.last_error}
              </div>
            </div>
          )}
        </div>

        {/* Delivery Attempts Table */}
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Attempt History
          </h4>

          {delivery.attempts && delivery.attempts.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 dark:bg-zinc-800/60 dark:border-zinc-800 text-slate-600 dark:text-zinc-400">
                  <tr>
                    <th className="px-3.5 py-2 font-semibold">Attempt</th>
                    <th className="px-3.5 py-2 font-semibold">Outcome</th>
                    <th className="px-3.5 py-2 font-semibold">Started At</th>
                    <th className="px-3.5 py-2 font-semibold">Finished At</th>
                    <th className="px-3.5 py-2 font-semibold">Error / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {delivery.attempts.map((attempt) => (
                    <tr
                      key={attempt.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-3.5 py-2 font-medium">#{attempt.attempt_number}</td>
                      <td className="px-3.5 py-2">
                        <StatusBadge status={attempt.outcome} size="sm" />
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap text-slate-600 dark:text-zinc-400">
                        {formatDate(attempt.started_at)}
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap text-slate-600 dark:text-zinc-400">
                        {formatDate(attempt.finished_at)}
                      </td>
                      <td className="px-3.5 py-2 text-slate-600 dark:text-zinc-400">
                        {attempt.error_message ? (
                          <span className="text-rose-600 dark:text-rose-400 font-mono">
                            {attempt.error_message}
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded dark:bg-zinc-800/40">
              No execution attempts logged yet. Waiting for scheduled execution time.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

