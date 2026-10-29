export type NotificationStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED';

export type DeliveryStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';

export type NotificationChannel = 'EMAIL' | 'PUSH' | 'TELEGRAM';

export type AttemptOutcome = 'SUCCESS' | 'RETRYING' | 'FAILED';

export interface NotificationRecord {
  id: string;
  user_id: string | null;
  title: string;
  body: string;
  scheduled_at: Date;
  timezone: string;
  status: NotificationStatus;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationDeliveryRecord {
  id: string;
  notification_id: string;
  channel: NotificationChannel;
  recipient: string;
  status: DeliveryStatus;
  attempt_count: number;
  next_retry_at: Date | null;
  provider_message_id: string | null;
  last_error: string | null;
  sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface DeliveryAttemptRecord {
  id: string;
  delivery_id: string;
  attempt_number: number;
  outcome: AttemptOutcome;
  error_message: string | null;
  started_at: Date;
  finished_at: Date | null;
}

export interface ChannelRecipientInput {
  channel: NotificationChannel;
  recipient: string;
}

export interface NotificationWithDeliveries extends NotificationRecord {
  deliveries: NotificationDeliveryRecord[];
}

