'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, ScheduledNotification } from '@/lib/api';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { FilterToolbar } from '@/components/dashboard/FilterToolbar';
import { NotificationTable } from '@/components/dashboard/NotificationTable';
import { Pagination } from '@/components/dashboard/Pagination';

export default function DashboardPage() {
  const [notifications, setNotifications] = useState<ScheduledNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getNotifications({
        status: statusFilter,
        page,
        limit: 10,
      });
      setNotifications(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalCount(response.meta?.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch scheduled notifications');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this pending notification?')) return;
    setActionLoadingId(id);
    try {
      await api.cancelNotification(id);
      await fetchNotifications();
    } catch (err: any) {
      alert(`Error cancelling: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRetry = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.retryNotification(id);
      await fetchNotifications();
    } catch (err: any) {
      alert(`Error retrying: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to delete all notification records and clear all queue jobs?')) return;
    try {
      const res = await api.deleteAllNotifications();
      alert(res.message);
      await fetchNotifications();
    } catch (err: any) {
      alert(`Error deleting records: ${err.message}`);
    }
  };

  const pendingCount = notifications.filter((n) => n.status === 'PENDING').length;
  const sentCount = notifications.filter((n) => n.status === 'SENT').length;
  const failedCount = notifications.filter((n) => n.status === 'FAILED').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            Scheduled Notifications Dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1">
            Observe multi-channel dispatches across Email, Push, and Telegram.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchNotifications()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 transition"
          >
            Refresh
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={loading || totalCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40 transition disabled:opacity-40"
          >
            Clear All
          </button>
          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm transition"
          >
            + Schedule New
          </Link>
        </div>
      </div>

      <KpiCards
        total={totalCount}
        pending={pendingCount}
        sent={sentCount}
        failed={failedCount}
      />

      <FilterToolbar
        currentStatus={statusFilter}
        onSelectStatus={(st) => {
          setStatusFilter(st);
          setPage(1);
        }}
      />

      {error && (
        <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 text-sm dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <NotificationTable
          notifications={notifications}
          loading={loading}
          statusFilter={statusFilter}
          actionLoadingId={actionLoadingId}
          onCancel={handleCancel}
          onRetry={handleRetry}
        />
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          loading={loading}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
