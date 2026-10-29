'use client';

import React, { useEffect, useState, useCallback, use, Suspense, useRef } from 'react';
import Link from 'next/link';
import {
  api,
  ScheduledNotification,
  NotificationDelivery,
} from '@/lib/api';
import { NotificationHeader } from '@/components/details/NotificationHeader';
import { NotificationMeta } from '@/components/details/NotificationMeta';
import { DeliveryCard } from '@/components/details/DeliveryCard';

export default function NotificationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-slate-500 dark:text-zinc-400">
          <div className="w-8 h-8 mx-auto border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
          Loading notification...
        </div>
      }
    >
      <NotificationDetailsContent paramsPromise={params} />
    </Suspense>
  );
}

function NotificationDetailsContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
}) {
  const { id } = use(paramsPromise);

  const [notification, setNotification] = useState<ScheduledNotification | null>(null);
  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const alertedRef = useRef(false);

  const fetchDetails = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [notifRes, delivRes] = await Promise.all([
        api.getNotification(id),
        api.getNotificationDeliveries(id),
      ]);
      setNotification(notifRes.data);
      setDeliveries(delivRes.data || []);
    } catch (err: any) {
      if (!silent) {
        setError(err?.message || 'Failed to load notification details');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Real-time polling when pending or processing
  useEffect(() => {
    if (!notification) return;
    const isTransitory =
      notification.status === 'PENDING' ||
      notification.status === 'PROCESSING' ||
      deliveries.some((d) => d.status === 'PENDING' || d.status === 'PROCESSING');

    if (!isTransitory) return;

    const interval = setInterval(() => {
      fetchDetails(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [notification, deliveries, fetchDetails]);

  // Trigger desktop browser notification when push delivery is completed
  useEffect(() => {
    if (!notification || alertedRef.current) return;
    const hasSentPush = deliveries.some(
      (d) => d.channel === 'PUSH' && d.status === 'SENT',
    );
    if (hasSentPush && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        alertedRef.current = true;
        try {
          new Notification(notification.title, {
            body: notification.body,
            icon: '/favicon.ico',
          });
        } catch (e) {
          console.warn('Native notification trigger:', e);
        }
      }
    }
  }, [notification, deliveries]);

  const handleCancel = async () => {
    if (!notification) return;
    if (!confirm('Are you sure you want to cancel this pending notification?')) return;
    setActionLoading(true);
    try {
      await api.cancelNotification(notification.id);
      await fetchDetails();
    } catch (err: any) {
      alert(`Error cancelling: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!notification) return;
    setActionLoading(true);
    try {
      await api.retryNotification(notification.id);
      await fetchDetails();
    } catch (err: any) {
      alert(`Error triggering retry: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryDelivery = async (deliveryId: string) => {
    if (!notification) return;
    setActionLoading(true);
    try {
      await api.retryDelivery(notification.id, deliveryId);
      await fetchDetails();
    } catch (err: any) {
      alert(`Error retrying delivery: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const hasFailedDeliveries = deliveries.some((d) => d.status === 'FAILED');

  if (loading && !notification) {
    return (
      <div className="p-16 text-center text-slate-500 dark:text-zinc-400">
        <div className="w-8 h-8 mx-auto border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        Loading notification details...
      </div>
    );
  }

  if (error || !notification) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
        <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 text-sm dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error || 'Notification not found'}
        </div>
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:underline"
        >
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <NotificationHeader
        notification={notification}
        hasFailedDeliveries={hasFailedDeliveries}
        loading={loading}
        actionLoading={actionLoading}
        onRefresh={() => fetchDetails()}
        onCancel={handleCancel}
        onRetry={handleRetry}
      />

      <NotificationMeta notification={notification} deliveries={deliveries} />

      {/* Message Content Preview */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Message Body Content
        </h3>
        <p className="text-sm text-slate-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 dark:bg-zinc-800/50 dark:border-zinc-800 font-sans">
          {notification.body}
        </p>
      </div>

      {/* Channel Deliveries & Attempt Logs */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
          Delivery Channels & Attempt History
        </h2>
        {deliveries.map((delivery) => (
          <DeliveryCard
            key={delivery.id}
            delivery={delivery}
            onRetry={handleRetryDelivery}
            isRetrying={actionLoading}
          />
        ))}
      </div>
    </div>
  );
}
