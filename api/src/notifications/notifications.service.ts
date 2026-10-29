import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository.js';
import { NotificationQueueService } from '../notification-queue/notification-queue.service.js';
import { EmailProvider } from '../notification-providers/email.provider.js';
import type {
  CreateNotificationDto,
  NotificationQueryDto,
  UpdateNotificationDto,
} from './notifications.dto.js';
import type {
  NotificationRecord,
  NotificationWithDeliveries,
} from './notifications.types.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repo: NotificationsRepository,
    private readonly queueService: NotificationQueueService,
    private readonly emailProvider: EmailProvider,
  ) {}

  resolveScheduledDate(scheduledAt: string, timezone: string): Date {
    const date = new Date(scheduledAt);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date provided for scheduled_at');
    }
    return date;
  }

  async create(dto: CreateNotificationDto): Promise<NotificationWithDeliveries> {
    const scheduledAtUtc = this.resolveScheduledDate(dto.scheduled_at, dto.timezone);

    const notification = await this.repo.createNotificationWithDeliveries({
      title: dto.title,
      body: dto.body,
      scheduledAt: scheduledAtUtc,
      timezone: dto.timezone,
      channels: dto.channels,
    });

    for (const delivery of notification.deliveries) {
      await this.queueService
        .enqueueDelivery(delivery.id, scheduledAtUtc)
        .catch((err) =>
          this.logger.error(`Failed to enqueue delivery ${delivery.id}: ${err.message}`),
        );
    }

    return notification;
  }

  async findAll(query: NotificationQueryDto) {
    const { items, total } = await this.repo.findAll({
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: items,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string): Promise<NotificationWithDeliveries> {
    const notification = await this.repo.findById(id);
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return notification;
  }

  async update(id: string, dto: UpdateNotificationDto): Promise<NotificationRecord> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    if (existing.status !== 'PENDING') {
      throw new BadRequestException(`Cannot edit notification with status "${existing.status}"`);
    }

    let scheduledAtUtc: Date | undefined;
    if (dto.scheduled_at) {
      scheduledAtUtc = this.resolveScheduledDate(dto.scheduled_at, dto.timezone || existing.timezone);
    }

    const updated = await this.repo.updatePendingNotification(id, {
      title: dto.title,
      body: dto.body,
      scheduledAt: scheduledAtUtc,
      timezone: dto.timezone,
    });

    if (!updated) {
      throw new BadRequestException('Failed to update notification');
    }

    if (scheduledAtUtc) {
      for (const delivery of existing.deliveries) {
        if (delivery.status === 'PENDING') {
          await this.queueService.removeDelivery(delivery.id);
          await this.queueService.enqueueDelivery(delivery.id, scheduledAtUtc);
        }
      }
    }

    return updated;
  }

  async cancel(id: string): Promise<NotificationRecord> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    if (existing.status === 'CANCELLED' || existing.status === 'SENT') {
      throw new BadRequestException(`Cannot cancel notification with status "${existing.status}"`);
    }

    const cancelled = await this.repo.cancelNotification(id);
    if (!cancelled) {
      throw new BadRequestException('Unable to cancel notification');
    }

    for (const delivery of existing.deliveries) {
      if (delivery.status === 'PENDING') {
        await this.queueService.removeDelivery(delivery.id);
      }
    }

    return cancelled;
  }

  async retry(id: string, deliveryId?: string): Promise<{ message: string; retriedCount: number }> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    const retriedDeliveries = await this.repo.resetFailedDeliveriesForRetry(id, deliveryId);
    if (retriedDeliveries.length === 0) {
      throw new BadRequestException('No eligible failed deliveries found to retry');
    }

    for (const delivery of retriedDeliveries) {
      const retried = await this.queueService.retryDeliveryJob(delivery.id);
      if (!retried) {
        await this.queueService.enqueueDelivery(delivery.id, new Date(), {
          overrideDelayMs: 0,
        });
      }
    }

    return {
      message: `Successfully scheduled retry for ${retriedDeliveries.length} delivery(ies)`,
      retriedCount: retriedDeliveries.length,
    };
  }

  async getDeliveries(notificationId: string) {
    const existing = await this.repo.findById(notificationId);
    if (!existing) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }
    return this.repo.getDeliveriesWithAttempts(notificationId);
  }

  async sendTestEmail(params: {
    to: string;
    subject?: string;
    body?: string;
  }): Promise<{ recipient: string; providerMessageId: string; sentAt: string }> {
    const recipient = params.to.trim();
    const title = params.subject?.trim() || 'Test Email from EC Learnix';
    const body = params.body?.trim() || 'Test email from local testing API';

    const result = await this.emailProvider.send({
      recipient,
      title,
      body,
      idempotencyKey: `test-email-${Date.now()}`,
    });

    return {
      recipient,
      providerMessageId: result.providerMessageId || 'msg-sent',
      sentAt: new Date().toISOString(),
    };
  }

  async deleteAll(): Promise<{ deletedCount: number }> {
    const deletedCount = await this.repo.deleteAllNotifications();
    await this.queueService.clearAllJobs();
    return { deletedCount };
  }
}
