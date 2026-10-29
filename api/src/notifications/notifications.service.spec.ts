import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import type { NotificationsRepository } from './notifications.repository.js';
import type { NotificationQueueService } from '../notification-queue/notification-queue.service.js';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockRepo: Partial<NotificationsRepository>;
  let mockQueueService: Partial<NotificationQueueService>;

  beforeEach(() => {
    mockRepo = {
      createNotificationWithDeliveries: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      updatePendingNotification: vi.fn(),
      cancelNotification: vi.fn(),
      resetFailedDeliveriesForRetry: vi.fn(),
      getDeliveriesWithAttempts: vi.fn(),
    };

    mockQueueService = {
      enqueueDelivery: vi.fn().mockResolvedValue('job-1'),
      removeDelivery: vi.fn().mockResolvedValue(undefined),
    };

    const mockEmailProvider = {
      send: vi.fn().mockResolvedValue({ providerMessageId: 'test-email-msg-id' }),
    };

    service = new NotificationsService(
      mockRepo as NotificationsRepository,
      mockQueueService as NotificationQueueService,
      mockEmailProvider as any,
    );
  });

  it('creates notification and enqueues BullMQ jobs for each channel delivery', async () => {
    const scheduledAt = new Date(Date.now() + 10000);
    const mockCreated = {
      id: 'notif-1',
      user_id: null,
      title: 'Test Title',
      body: 'Test Body',
      scheduled_at: scheduledAt,
      timezone: 'UTC',
      status: 'PENDING' as const,
      created_at: new Date(),
      updated_at: new Date(),
      deliveries: [
        {
          id: 'del-1',
          notification_id: 'notif-1',
          channel: 'EMAIL' as const,
          recipient: 'user@example.com',
          status: 'PENDING' as const,
          attempt_count: 0,
          next_retry_at: null,
          provider_message_id: null,
          last_error: null,
          sent_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'del-2',
          notification_id: 'notif-1',
          channel: 'TELEGRAM' as const,
          recipient: '999999',
          status: 'PENDING' as const,
          attempt_count: 0,
          next_retry_at: null,
          provider_message_id: null,
          last_error: null,
          sent_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    };

    (mockRepo.createNotificationWithDeliveries as any).mockResolvedValue(mockCreated);

    const result = await service.create({
      title: 'Test Title',
      body: 'Test Body',
      scheduled_at: scheduledAt.toISOString(),
      timezone: 'UTC',
      channels: [
        { channel: 'EMAIL', recipient: 'user@example.com' },
        { channel: 'TELEGRAM', recipient: '999999' },
      ],
    });

    expect(result.id).toBe('notif-1');
    expect(mockRepo.createNotificationWithDeliveries).toHaveBeenCalledTimes(1);
    expect(mockQueueService.enqueueDelivery).toHaveBeenCalledTimes(2);
    expect(mockQueueService.enqueueDelivery).toHaveBeenCalledWith('del-1', scheduledAt);
    expect(mockQueueService.enqueueDelivery).toHaveBeenCalledWith('del-2', scheduledAt);
  });

  it('cancels pending notification and purges queue jobs', async () => {
    const existing = {
      id: 'notif-1',
      status: 'PENDING' as const,
      deliveries: [
        { id: 'del-1', status: 'PENDING' as const },
        { id: 'del-2', status: 'PENDING' as const },
      ],
    };

    (mockRepo.findById as any).mockResolvedValue(existing);
    (mockRepo.cancelNotification as any).mockResolvedValue({
      ...existing,
      status: 'CANCELLED',
    });

    const result = await service.cancel('notif-1');

    expect(result.status).toBe('CANCELLED');
    expect(mockRepo.cancelNotification).toHaveBeenCalledWith('notif-1');
    expect(mockQueueService.removeDelivery).toHaveBeenCalledWith('del-1');
    expect(mockQueueService.removeDelivery).toHaveBeenCalledWith('del-2');
  });

  it('rejects cancellation if already SENT', async () => {
    (mockRepo.findById as any).mockResolvedValue({
      id: 'notif-1',
      status: 'SENT',
      deliveries: [],
    });

    await expect(service.cancel('notif-1')).rejects.toThrow(BadRequestException);
  });

  it('retries failed deliveries by re-enqueuing immediately', async () => {
    (mockRepo.findById as any).mockResolvedValue({
      id: 'notif-1',
      status: 'FAILED',
    });

    (mockRepo.resetFailedDeliveriesForRetry as any).mockResolvedValue([
      { id: 'del-failed-1' },
      { id: 'del-failed-2' },
    ]);

    const result = await service.retry('notif-1');

    expect(result.retriedCount).toBe(2);
    expect(mockRepo.resetFailedDeliveriesForRetry).toHaveBeenCalledWith('notif-1', undefined);
    expect(mockQueueService.enqueueDelivery).toHaveBeenCalledTimes(2);
  });

  it('retries single failed delivery by re-enqueuing immediately', async () => {
    (mockRepo.findById as any).mockResolvedValue({
      id: 'notif-1',
      status: 'FAILED',
    });

    (mockRepo.resetFailedDeliveriesForRetry as any).mockResolvedValue([
      { id: 'del-failed-1' },
    ]);

    const result = await service.retry('notif-1', 'del-failed-1');

    expect(result.retriedCount).toBe(1);
    expect(mockRepo.resetFailedDeliveriesForRetry).toHaveBeenCalledWith('notif-1', 'del-failed-1');
    expect(mockQueueService.enqueueDelivery).toHaveBeenCalledTimes(1);
  });

  it('sends test email directly through email provider', async () => {
    const res = await service.sendTestEmail({
      to: 'recipient@example.com',
      subject: 'POC Test',
      body: 'Testing Nodemailer',
    });

    expect(res.recipient).toBe('recipient@example.com');
    expect(res.providerMessageId).toBe('test-email-msg-id');
    expect(res.sentAt).toBeDefined();
  });
});

