import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotificationProcessor,
  MAX_DELIVERY_ATTEMPTS,
} from './notification.processor.js';
import type { NotificationsRepository } from '../notifications/notifications.repository.js';
import type { NotificationProviderFactory } from '../notification-providers/notification-provider.factory.js';
import type { NotificationQueueService } from '../notification-queue/notification-queue.service.js';

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;
  let mockRepo: Partial<NotificationsRepository>;
  let mockProviderFactory: Partial<NotificationProviderFactory>;
  let mockQueueService: Partial<NotificationQueueService>;
  let mockProvider: { send: any };

  beforeEach(() => {
    mockProvider = {
      send: vi.fn().mockResolvedValue({ providerMessageId: 'msg-123' }),
    };

    mockRepo = {
      claimDeliveryForProcessing: vi.fn(),
      recordAttemptStart: vi.fn().mockResolvedValue({} as any),
      recordDeliverySuccess: vi.fn().mockResolvedValue(undefined),
      recordDeliveryFailure: vi.fn().mockResolvedValue(undefined),
    };

    mockProviderFactory = {
      getProvider: vi.fn().mockReturnValue(mockProvider),
    };

    mockQueueService = {
      enqueueDelivery: vi.fn().mockResolvedValue('job-retry'),
    };

    processor = new NotificationProcessor(
      mockRepo as NotificationsRepository,
      mockProviderFactory as NotificationProviderFactory,
      mockQueueService as NotificationQueueService,
    );
  });

  it('claims delivery atomically and marks success when provider sends message', async () => {
    const claim = {
      delivery: {
        id: 'del-1',
        notification_id: 'notif-1',
        channel: 'EMAIL' as const,
        recipient: 'test@example.com',
        attempt_count: 0,
      },
      notification: {
        id: 'notif-1',
        title: 'Meeting Alert',
        body: 'Please join the call',
        status: 'PENDING' as const,
      },
    };

    (mockRepo.claimDeliveryForProcessing as any).mockResolvedValue(claim);

    await processor.process({ data: { deliveryId: 'del-1' } } as any);

    expect(mockRepo.claimDeliveryForProcessing).toHaveBeenCalledWith('del-1');
    expect(mockRepo.recordAttemptStart).toHaveBeenCalledWith('del-1', 1);
    expect(mockProvider.send).toHaveBeenCalledWith({
      recipient: 'test@example.com',
      title: 'Meeting Alert',
      body: 'Please join the call',
      idempotencyKey: 'delivery-del-1-attempt-1',
    });
    expect(mockRepo.recordDeliverySuccess).toHaveBeenCalledWith({
      deliveryId: 'del-1',
      attemptNumber: 1,
      providerMessageId: 'msg-123',
    });
  });

  it('skips processing if delivery is already claimed by another worker (concurrency protection)', async () => {
    // Conditional update returns null when already claimed
    (mockRepo.claimDeliveryForProcessing as any).mockResolvedValue(null);

    await processor.process({ data: { deliveryId: 'del-1' } } as any);

    expect(mockRepo.recordAttemptStart).not.toHaveBeenCalled();
    expect(mockProvider.send).not.toHaveBeenCalled();
  });

  it('skips processing if notification has been cancelled', async () => {
    const claim = {
      delivery: {
        id: 'del-1',
        notification_id: 'notif-1',
        channel: 'EMAIL' as const,
        recipient: 'test@example.com',
        attempt_count: 0,
      },
      notification: {
        id: 'notif-1',
        title: 'Meeting Alert',
        body: 'Please join the call',
        status: 'CANCELLED' as const,
      },
    };

    (mockRepo.claimDeliveryForProcessing as any).mockResolvedValue(claim);

    await processor.process({ data: { deliveryId: 'del-1' } } as any);

    expect(mockProvider.send).not.toHaveBeenCalled();
    expect(mockRepo.recordDeliverySuccess).not.toHaveBeenCalled();
  });

  it('schedules retry with backoff and records failure on temporary error', async () => {
    const claim = {
      delivery: {
        id: 'del-1',
        notification_id: 'notif-1',
        channel: 'TELEGRAM' as const,
        recipient: '12345',
        attempt_count: 0, // Will become attempt 1
      },
      notification: {
        id: 'notif-1',
        title: 'Alert',
        body: 'Body',
        status: 'PENDING' as const,
      },
    };

    (mockRepo.claimDeliveryForProcessing as any).mockResolvedValue(claim);
    mockProvider.send.mockRejectedValue(new Error('Network timeout connecting to Telegram'));

    await processor.process({ data: { deliveryId: 'del-1' } } as any);

    expect(mockRepo.recordDeliveryFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryId: 'del-1',
        attemptNumber: 1,
        isFinal: false,
        errorMessage: 'Network timeout connecting to Telegram',
      }),
    );
    expect(mockQueueService.enqueueDelivery).toHaveBeenCalledTimes(1);
  });

  it('marks delivery as permanently FAILED when max retries are exhausted', async () => {
    const claim = {
      delivery: {
        id: 'del-1',
        notification_id: 'notif-1',
        channel: 'PUSH' as const,
        recipient: 'token',
        attempt_count: MAX_DELIVERY_ATTEMPTS - 1, // Will reach MAX_DELIVERY_ATTEMPTS (4)
      },
      notification: {
        id: 'notif-1',
        title: 'Alert',
        body: 'Body',
        status: 'PENDING' as const,
      },
    };

    (mockRepo.claimDeliveryForProcessing as any).mockResolvedValue(claim);
    mockProvider.send.mockRejectedValue(new Error('Permanent device token unregister'));

    await processor.process({ data: { deliveryId: 'del-1' } } as any);

    expect(mockRepo.recordDeliveryFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryId: 'del-1',
        attemptNumber: MAX_DELIVERY_ATTEMPTS,
        isFinal: true,
      }),
    );
    // Should NOT re-enqueue
    expect(mockQueueService.enqueueDelivery).not.toHaveBeenCalled();
  });
});

