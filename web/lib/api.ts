export interface DeliveryAttempt {
  id: string;
  delivery_id: string;
  attempt_number: number;
  outcome: "SUCCESS" | "RETRYING" | "FAILED";
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface NotificationDelivery {
  id: string;
  notification_id: string;
  channel: "EMAIL" | "PUSH" | "TELEGRAM";
  recipient: string;
  status: "PENDING" | "PROCESSING" | "SENT" | "FAILED";
  attempt_count: number;
  next_retry_at: string | null;
  provider_message_id: string | null;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  attempts?: DeliveryAttempt[];
}

export interface ScheduledNotification {
  id: string;
  user_id: string | null;
  title: string;
  body: string;
  scheduled_at: string;
  timezone: string;
  status: "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED";
  created_at: string;
  updated_at: string;
  deliveries: NotificationDelivery[];
}

export interface CreateNotificationPayload {
  title: string;
  body: string;
  scheduled_at: string;
  timezone: string;
  channels: Array<{
    channel: "EMAIL" | "PUSH" | "TELEGRAM";
    recipient: string;
  }>;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg =
      data?.errors?.join(", ") ||
      data?.message ||
      `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  async getNotifications(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: ScheduledNotification[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== "ALL") {
      query.set("status", params.status);
    }
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const qs = query.toString();
    return fetchJson(`/api/notifications${qs ? `?${qs}` : ""}`);
  },

  async getNotification(id: string): Promise<{ data: ScheduledNotification }> {
    return fetchJson(`/api/notifications/${id}`);
  },

  async getNotificationDeliveries(
    id: string,
  ): Promise<{ data: NotificationDelivery[] }> {
    return fetchJson(`/api/notifications/${id}/deliveries`);
  },

  async createNotification(
    payload: CreateNotificationPayload,
  ): Promise<{ data: ScheduledNotification; message: string }> {
    return fetchJson("/api/notifications", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async cancelNotification(
    id: string,
  ): Promise<{ data: ScheduledNotification; message: string }> {
    return fetchJson(`/api/notifications/${id}/cancel`, {
      method: "POST",
    });
  },

  async retryNotification(
    id: string,
  ): Promise<{ message: string; data: { retriedCount: number } }> {
    return fetchJson(`/api/notifications/${id}/retry`, {
      method: "POST",
    });
  },

  async retryDelivery(
    notificationId: string,
    deliveryId: string,
  ): Promise<{ message: string; data: { retriedCount: number } }> {
    return fetchJson(`/api/notifications/${notificationId}/deliveries/${deliveryId}/retry`, {
      method: "POST",
    });
  },

  async deleteAllNotifications(): Promise<{ message: string; data: { deletedCount: number } }> {
    return fetchJson('/api/notifications', {
      method: 'DELETE',
    });
  },

  async sendTestEmail(params: {
    to: string;
    subject?: string;
    body?: string;
  }): Promise<{ message: string; data: { recipient: string; providerMessageId: string; sentAt: string } }> {
    return fetchJson('/api/notifications/test-email', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async registerDevice(payload: {
    token: string;
    platform: 'WEB' | 'ANDROID' | 'IOS';
    deviceName?: string;
    userId?: string;
  }): Promise<{ message: string; data: any }> {
    return fetchJson('/api/devices/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async listDevices(): Promise<{ data: any[] }> {
    return fetchJson('/api/devices');
  },
};
