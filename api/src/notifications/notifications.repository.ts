import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService, PoolClient } from '../database/database.service.js';
import type {
  ChannelRecipientInput,
  DeliveryAttemptRecord,
  DeliveryStatus,
  NotificationDeliveryRecord,
  NotificationRecord,
  NotificationStatus,
  NotificationWithDeliveries,
} from './notifications.types.js';

@Injectable()
export class NotificationsRepository {
  private readonly logger = new Logger(NotificationsRepository.name);

  constructor(private readonly db: DatabaseService) {}

  async createNotificationWithDeliveries(params: {
    userId?: string | null;
    title: string;
    body: string;
    scheduledAt: Date;
    timezone: string;
    channels: ChannelRecipientInput[];
  }): Promise<NotificationWithDeliveries> {
    return this.db.transaction(async (client: PoolClient) => {
      const notifResult = await client.query<NotificationRecord>(
        `INSERT INTO notifications (user_id, title, body, scheduled_at, timezone, status)
         VALUES ($1, $2, $3, $4, $5, 'PENDING')
         RETURNING *`,
        [
          params.userId ?? null,
          params.title,
          params.body,
          params.scheduledAt.toISOString(),
          params.timezone,
        ],
      );

      const notification = notifResult.rows[0];
      const deliveries: NotificationDeliveryRecord[] = [];

      for (const ch of params.channels) {
        const delivResult = await client.query<NotificationDeliveryRecord>(
          `INSERT INTO notification_deliveries (notification_id, channel, recipient, status, attempt_count)
           VALUES ($1, $2, $3, 'PENDING', 0)
           RETURNING *`,
          [notification.id, ch.channel, ch.recipient],
        );
        deliveries.push(delivResult.rows[0]);
      }

      return {
        ...notification,
        deliveries,
      };
    });
  }

  async findAll(params: {
    status?: NotificationStatus;
    page: number;
    limit: number;
  }): Promise<{ items: NotificationWithDeliveries[]; total: number }> {
    const offset = (params.page - 1) * params.limit;
    const values: any[] = [];
    let whereClause = '';

    if (params.status) {
      values.push(params.status);
      whereClause = `WHERE status = $${values.length}`;
    }

    const countSql = `SELECT COUNT(*) AS total FROM notifications ${whereClause}`;
    const countResult = await this.db.query<{ total: string }>(countSql, values);
    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    const queryValues = [...values, params.limit, offset];
    const limitPlaceholder = `$${values.length + 1}`;
    const offsetPlaceholder = `$${values.length + 2}`;

    const itemsSql = `
      SELECT n.*,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', d.id,
                   'notification_id', d.notification_id,
                   'channel', d.channel,
                   'recipient', d.recipient,
                   'status', d.status,
                   'attempt_count', d.attempt_count,
                   'next_retry_at', d.next_retry_at,
                   'provider_message_id', d.provider_message_id,
                   'last_error', d.last_error,
                   'sent_at', d.sent_at,
                   'created_at', d.created_at,
                   'updated_at', d.updated_at
                 ) ORDER BY d.created_at ASC
               ) FILTER (WHERE d.id IS NOT NULL),
               '[]'
             ) AS deliveries
      FROM notifications n
      LEFT JOIN notification_deliveries d ON d.notification_id = n.id
      ${whereClause}
      GROUP BY n.id
      ORDER BY n.scheduled_at DESC, n.created_at DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const itemsResult = await this.db.query<any>(itemsSql, queryValues);

    return {
      items: itemsResult.rows,
      total,
    };
  }

  async findById(id: string): Promise<NotificationWithDeliveries | null> {
    const sql = `
      SELECT n.*,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', d.id,
                   'notification_id', d.notification_id,
                   'channel', d.channel,
                   'recipient', d.recipient,
                   'status', d.status,
                   'attempt_count', d.attempt_count,
                   'next_retry_at', d.next_retry_at,
                   'provider_message_id', d.provider_message_id,
                   'last_error', d.last_error,
                   'sent_at', d.sent_at,
                   'created_at', d.created_at,
                   'updated_at', d.updated_at
                 ) ORDER BY d.created_at ASC
               ) FILTER (WHERE d.id IS NOT NULL),
               '[]'
             ) AS deliveries
      FROM notifications n
      LEFT JOIN notification_deliveries d ON d.notification_id = n.id
      WHERE n.id = $1
      GROUP BY n.id
    `;

    const result = await this.db.query<any>(sql, [id]);
    return result.rows[0] || null;
  }

  async updatePendingNotification(
    id: string,
    updates: {
      title?: string;
      body?: string;
      scheduledAt?: Date;
      timezone?: string;
    },
  ): Promise<NotificationRecord | null> {
    const fields: string[] = [];
    const values: any[] = [id];

    if (updates.title !== undefined) {
      values.push(updates.title);
      fields.push(`title = $${values.length}`);
    }
    if (updates.body !== undefined) {
      values.push(updates.body);
      fields.push(`body = $${values.length}`);
    }
    if (updates.scheduledAt !== undefined) {
      values.push(updates.scheduledAt.toISOString());
      fields.push(`scheduled_at = $${values.length}`);
    }
    if (updates.timezone !== undefined) {
      values.push(updates.timezone);
      fields.push(`timezone = $${values.length}`);
    }

    if (fields.length === 0) {
      const res = await this.db.query<NotificationRecord>(
        'SELECT * FROM notifications WHERE id = $1',
        [id],
      );
      return res.rows[0] || null;
    }

    fields.push('updated_at = NOW()');

    const sql = `
      UPDATE notifications
      SET ${fields.join(', ')}
      WHERE id = $1 AND status = 'PENDING'
      RETURNING *
    `;

    const result = await this.db.query<NotificationRecord>(sql, values);
    return result.rows[0] || null;
  }

  async cancelNotification(id: string): Promise<NotificationRecord | null> {
    return this.db.transaction(async (client) => {
      const notifRes = await client.query<NotificationRecord>(
        `UPDATE notifications
         SET status = 'CANCELLED', updated_at = NOW()
         WHERE id = $1 AND status IN ('PENDING', 'PROCESSING')
         RETURNING *`,
        [id],
      );

      if (notifRes.rows.length === 0) {
        return null;
      }

      await client.query(
        `UPDATE notification_deliveries
         SET status = 'FAILED', last_error = 'Cancelled by user', updated_at = NOW()
         WHERE notification_id = $1 AND status IN ('PENDING')`,
        [id],
      );

      return notifRes.rows[0];
    });
  }

  async getDeliveriesWithAttempts(notificationId: string): Promise<any[]> {
    const sql = `
      SELECT d.*,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', a.id,
                   'delivery_id', a.delivery_id,
                   'attempt_number', a.attempt_number,
                   'outcome', a.outcome,
                   'error_message', a.error_message,
                   'started_at', a.started_at,
                   'finished_at', a.finished_at
                 ) ORDER BY a.attempt_number ASC
               ) FILTER (WHERE a.id IS NOT NULL),
               '[]'
             ) AS attempts
      FROM notification_deliveries d
      LEFT JOIN delivery_attempts a ON a.delivery_id = d.id
      WHERE d.notification_id = $1
      GROUP BY d.id
      ORDER BY d.created_at ASC
    `;

    const result = await this.db.query(sql, [notificationId]);
    return result.rows;
  }

  async claimDeliveryForProcessing(
    deliveryId: string,
  ): Promise<{ delivery: NotificationDeliveryRecord; notification: NotificationRecord } | null> {
    return this.db.transaction(async (client) => {
      const deliveryRes = await client.query<NotificationDeliveryRecord>(
        `UPDATE notification_deliveries
         SET status = 'PROCESSING', updated_at = NOW()
         WHERE id = $1 AND status IN ('PENDING', 'FAILED')
         RETURNING *`,
        [deliveryId],
      );

      if (deliveryRes.rows.length === 0) {
        return null;
      }

      const delivery = deliveryRes.rows[0];

      const notifRes = await client.query<NotificationRecord>(
        `UPDATE notifications
         SET status = 'PROCESSING', updated_at = NOW()
         WHERE id = $1 AND status = 'PENDING'
         RETURNING *`,
        [delivery.notification_id],
      );

      let notification: NotificationRecord;
      if (notifRes.rows.length > 0) {
        notification = notifRes.rows[0];
      } else {
        const fetchNotif = await client.query<NotificationRecord>(
          'SELECT * FROM notifications WHERE id = $1',
          [delivery.notification_id],
        );
        notification = fetchNotif.rows[0];
      }

      return { delivery, notification };
    });
  }

  async recordAttemptStart(
    deliveryId: string,
    attemptNumber: number,
  ): Promise<DeliveryAttemptRecord> {
    const sql = `
      INSERT INTO delivery_attempts (delivery_id, attempt_number, outcome, started_at)
      VALUES ($1, $2, 'RETRYING', NOW())
      ON CONFLICT (delivery_id, attempt_number)
      DO UPDATE SET started_at = NOW(), outcome = 'RETRYING'
      RETURNING *
    `;
    const res = await this.db.query<DeliveryAttemptRecord>(sql, [
      deliveryId,
      attemptNumber,
    ]);
    return res.rows[0];
  }

  async recordDeliverySuccess(params: {
    deliveryId: string;
    attemptNumber: number;
    providerMessageId?: string;
  }): Promise<void> {
    await this.db.transaction(async (client) => {
      await client.query(
        `UPDATE notification_deliveries
         SET status = 'SENT',
             sent_at = NOW(),
             provider_message_id = $2,
             last_error = NULL,
             next_retry_at = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [params.deliveryId, params.providerMessageId ?? null],
      );

      await client.query(
        `UPDATE delivery_attempts
         SET outcome = 'SUCCESS',
             finished_at = NOW(),
             error_message = NULL
         WHERE delivery_id = $1 AND attempt_number = $2`,
        [params.deliveryId, params.attemptNumber],
      );

      await this.finalizeNotificationStatus(client, params.deliveryId);
    });
  }

  async recordDeliveryFailure(params: {
    deliveryId: string;
    attemptNumber: number;
    errorMessage: string;
    isFinal: boolean;
    nextRetryAt?: Date | null;
  }): Promise<void> {
    await this.db.transaction(async (client) => {
      const newStatus: DeliveryStatus = params.isFinal ? 'FAILED' : 'PENDING';
      const outcome = params.isFinal ? 'FAILED' : 'RETRYING';

      await client.query(
        `UPDATE notification_deliveries
         SET status = $2,
             attempt_count = attempt_count + 1,
             last_error = $3,
             next_retry_at = $4,
             updated_at = NOW()
         WHERE id = $1`,
        [
          params.deliveryId,
          newStatus,
          params.errorMessage,
          params.nextRetryAt ? params.nextRetryAt.toISOString() : null,
        ],
      );

      await client.query(
        `UPDATE delivery_attempts
         SET outcome = $3,
             finished_at = NOW(),
             error_message = $4
         WHERE delivery_id = $1 AND attempt_number = $2`,
        [params.deliveryId, params.attemptNumber, outcome, params.errorMessage],
      );

      if (params.isFinal) {
        await this.finalizeNotificationStatus(client, params.deliveryId);
      }
    });
  }

  private async finalizeNotificationStatus(
    client: PoolClient,
    deliveryId: string,
  ): Promise<void> {
    const parentRes = await client.query<{ notification_id: string }>(
      'SELECT notification_id FROM notification_deliveries WHERE id = $1',
      [deliveryId],
    );
    if (parentRes.rows.length === 0) return;
    const notificationId = parentRes.rows[0].notification_id;

    const allDeliveries = await client.query<{ status: DeliveryStatus }>(
      'SELECT status FROM notification_deliveries WHERE notification_id = $1',
      [notificationId],
    );

    const statuses = allDeliveries.rows.map((r) => r.status);
    const allSent = statuses.every((s) => s === 'SENT');
    const allFinal = statuses.every((s) => s === 'SENT' || s === 'FAILED');

    let newStatus: NotificationStatus = 'PROCESSING';
    if (allSent) {
      newStatus = 'SENT';
    } else if (allFinal) {
      const anySent = statuses.some((s) => s === 'SENT');
      newStatus = anySent ? 'SENT' : 'FAILED';
    }

    await client.query(
      `UPDATE notifications
       SET status = $2, updated_at = NOW()
       WHERE id = $1 AND status NOT IN ('CANCELLED')`,
      [notificationId, newStatus],
    );
  }

  async findOverduePendingDeliveries(): Promise<
    Array<{
      delivery_id: string;
      notification_id: string;
      channel: string;
      recipient: string;
      scheduled_at: Date;
      attempt_count: number;
    }>
  > {
    const sql = `
      SELECT d.id AS delivery_id,
             d.notification_id,
             d.channel,
             d.recipient,
             d.attempt_count,
             n.scheduled_at
      FROM notification_deliveries d
      JOIN notifications n ON n.id = d.notification_id
      WHERE n.status NOT IN ('CANCELLED', 'SENT')
        AND (
          (d.status = 'PENDING' AND n.scheduled_at <= NOW() AND (d.next_retry_at IS NULL OR d.next_retry_at <= NOW()))
          OR
          (d.status = 'PROCESSING' AND d.updated_at < NOW() - INTERVAL '5 minutes')
        )
      LIMIT 100
    `;
    const res = await this.db.query(sql);
    return res.rows;
  }

  async resetFailedDeliveriesForRetry(notificationId: string): Promise<NotificationDeliveryRecord[]> {
    return this.db.transaction(async (client) => {
      const delivRes = await client.query<NotificationDeliveryRecord>(
        `UPDATE notification_deliveries
         SET status = 'PENDING',
             last_error = NULL,
             next_retry_at = NOW(),
             updated_at = NOW()
         WHERE notification_id = $1 AND status = 'FAILED'
         RETURNING *`,
        [notificationId],
      );

      if (delivRes.rows.length > 0) {
        await client.query(
          `UPDATE notifications
           SET status = 'PENDING', updated_at = NOW()
           WHERE id = $1 AND status != 'CANCELLED'`,
          [notificationId],
        );
      }

      return delivRes.rows;
    });
  }
}

