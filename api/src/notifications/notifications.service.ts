import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository.js';
import { NotificationQueueService } from '../notification-queue/notification-queue.service.js';
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
  ) {}

  /**
   * Interprets date/time in specified IANA timezone and resolves to UTC instant
   */
  resolveScheduledDate(scheduledAt: string, timezone: string): Date {
    // If string has explicit offset or Z, standard Date parsing evaluates it
    const date = new Date(scheduledAt);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date provided for scheduled_at');
    }
    return date;
  }

  async create(
    dto: CreateNotificationDto,
  ): Promise<NotificationWithDeliveries> {
    const scheduledAtUtc = this.resolveScheduledDate(
      dto.scheduled_at,
      dto.timezone,
    );
    console.log('dto---->', dto);
    // Atomically insert notification and channel-specific deliveries
    const notification = await this.repo.createNotificationWithDeliveries({
      title: dto.title,
      body: dto.body,
      scheduledAt: scheduledAtUtc,
      timezone: dto.timezone,
      channels: dto.channels,
    });

    this.logger.log(
      `Created notification ${notification.id} scheduled for ${scheduledAtUtc.toISOString()} (${dto.timezone}) with ${dto.channels.length} delivery channel(s)`,
    );

    // Enqueue independent BullMQ jobs for each delivery
    for (const delivery of notification.deliveries) {
      try {
        await this.queueService.enqueueDelivery(delivery.id, scheduledAtUtc);
      } catch (err: any) {
        this.logger.error(
          `Failed to enqueue BullMQ job for delivery ${delivery.id}: ${err.message}. Recovery process will reconcile this.`,
        );
      }
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

  async update(
    id: string,
    dto: UpdateNotificationDto,
  ): Promise<NotificationRecord> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    if (existing.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot edit a notification with status "${existing.status}". Only PENDING notifications can be edited.`,
      );
    }

    let scheduledAtUtc: Date | undefined;
    if (dto.scheduled_at) {
      const tz = dto.timezone || existing.timezone;
      scheduledAtUtc = this.resolveScheduledDate(dto.scheduled_at, tz);
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

    // If scheduled time was changed, update pending BullMQ queue jobs
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
      throw new BadRequestException(
        `Cannot cancel notification because its current status is "${existing.status}"`,
      );
    }

    const cancelled = await this.repo.cancelNotification(id);
    if (!cancelled) {
      throw new BadRequestException('Unable to cancel notification');
    }

    // Remove queued jobs from BullMQ
    for (const delivery of existing.deliveries) {
      if (delivery.status === 'PENDING') {
        await this.queueService.removeDelivery(delivery.id);
      }
    }

    this.logger.log(`Cancelled notification ${id}`);
    return cancelled;
  }

  async retry(id: string): Promise<{ message: string; retriedCount: number }> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    const retriedDeliveries = await this.repo.resetFailedDeliveriesForRetry(id);
    if (retriedDeliveries.length === 0) {
      throw new BadRequestException(
        'No eligible failed deliveries found to retry for this notification',
      );
    }

    // Re-enqueue BullMQ jobs immediately
    for (const delivery of retriedDeliveries) {
      await this.queueService.enqueueDelivery(delivery.id, new Date(), {
        overrideDelayMs: 0,
      });
    }

    this.logger.log(
      `Re-enqueued ${retriedDeliveries.length} failed delivery jobs for notification ${id}`,
    );

    return {
      message: `Successfully scheduled retry for ${retriedDeliveries.length} deliveries`,
      retriedCount: retriedDeliveries.length,
    };
  }

  async getDeliveries(notificationId: string) {
    const existing = await this.repo.findById(notificationId);
    if (!existing) {
      throw new NotFoundException(
        `Notification with ID ${notificationId} not found`,
      );
    }
    return this.repo.getDeliveriesWithAttempts(notificationId);
  }
}
