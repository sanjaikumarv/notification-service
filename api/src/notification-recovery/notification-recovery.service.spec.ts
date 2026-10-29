import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationRecoveryService } from './notification-recovery.service.js';
import type { NotificationsRepository } from '../notifications/notifications.repository.js';
import type { NotificationQueueService } from '../notification-queue/notification-queue.service.js';

describe('NotificationRecoveryService', () => {
  let service: NotificationRecoveryService;
  let mockRepo: Partial<NotificationsRepository>;
  let mockQueueService: Partial<NotificationQueueService>;

  beforeEach(() => {
    mockRepo = {
      findOverduePendingDeliveries: vi.fn(),
    };

    mockQueueService = {
      isJobActiveOrDelayed: vi.fn(),
      enqueueDelivery: vi.fn().mockResolvedValue('recovered-job-id'),
    };

    service = new NotificationRecoveryService(
      mockRepo as NotificationsRepository,
      mockQueueService as NotificationQueueService,
    );
  });

  it('re-enqueues overdue deliveries whose jobs are missing in Redis queue', async () => {
    const overdue = [
      {
        delivery_id: 'del-missing-1',
        notification_id: 'notif-1',
        channel: 'EMAIL',
        recipient: 'user@test.com',
        scheduled_at: new Date(Date.now() - 60000),
        attempt_count: 0,
      },
      {
        delivery_id: 'del-active-2',
        notification_id: 'notif-2',
        channel: 'TELEGRAM',
        recipient: '12345',
        scheduled_at: new Date(Date.now() - 30000),
        attempt_count: 0,
      },
    ];

    (mockRepo.findOverduePendingDeliveries as any).mockResolvedValue(overdue);
    // First job is missing in Redis, second job is already in queue
    (mockQueueService.isJobActiveOrDelayed as any).mockImplementation(
      async (id: string) => id === 'del-active-2',
    );

    const recoveredCount = await service.reconcileOverdueDeliveries();

    expect(recoveredCount).toBe(1);
    expect(mockQueueService.enqueueDelivery).toHaveBeenCalledTimes(1);
    expect(mockQueueService.enqueueDelivery).toHaveBeenCalledWith(
      'del-missing-1',
      expect.any(Date),
      { overrideDelayMs: 0 },
    );
  });

  it('handles clean recovery when no deliveries are overdue', async () => {
    (mockRepo.findOverduePendingDeliveries as any).mockResolvedValue([]);

    const recoveredCount = await service.reconcileOverdueDeliveries();

    expect(recoveredCount).toBe(0);
    expect(mockQueueService.enqueueDelivery).not.toHaveBeenCalled();
  });
});

