import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  NOTIFICATIONS_QUEUE_NAME,
  DeliveryJobData,
  NotificationQueueService,
} from '../notification-queue/notification-queue.service.js';
import { NotificationsRepository } from '../notifications/notifications.repository.js';
import { NotificationProviderFactory } from '../notification-providers/notification-provider.factory.js';

export const MAX_DELIVERY_ATTEMPTS = 4;
export const BASE_RETRY_DELAY_MS = 5000;
export const MAX_RETRY_DELAY_MS = 300000; // 5 minutes max

@Processor(NOTIFICATIONS_QUEUE_NAME, {
  concurrency: 5,
})
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly repo: NotificationsRepository,
    private readonly providerFactory: NotificationProviderFactory,
    private readonly queueService: NotificationQueueService,
  ) {
    super();
  }

  async process(job: Job<DeliveryJobData>): Promise<void> {
    const { deliveryId } = job.data;
    this.logger.log(
      `[Worker] Received job ${job.id} for delivery ${deliveryId}`,
    );

    // Step 1 & 3: Atomically claim the delivery
    const claim = await this.repo.claimDeliveryForProcessing(deliveryId);
    if (!claim) {
      this.logger.warn(
        `[Worker] Delivery ${deliveryId} could not be claimed (already processing, completed, or cancelled). Skipping.`,
      );
      return;
    }

    const { delivery, notification } = claim;

    // Step 2: Check that notification is not cancelled
    if (notification.status === 'CANCELLED') {
      this.logger.warn(
        `[Worker] Notification ${notification.id} is cancelled. Skipping delivery ${delivery.id}.`,
      );
      return;
    }

    // Step 4: Record attempt start
    const attemptNumber = delivery.attempt_count + 1;
    await this.repo.recordAttemptStart(delivery.id, attemptNumber);

    // Step 5: Send through the appropriate provider
    try {
      const provider = this.providerFactory.getProvider(delivery.channel);
      const idempotencyKey = `delivery-${delivery.id}-attempt-${attemptNumber}`;

      const result = await provider.send({
        recipient: delivery.recipient,
        title: notification.title,
        body: notification.body,
        idempotencyKey,
      });

      // Step 6: Persist result
      await this.repo.recordDeliverySuccess({
        deliveryId: delivery.id,
        attemptNumber,
        providerMessageId: result.providerMessageId,
      });

      this.logger.log(
        `[Worker] Successfully delivered ${delivery.channel} for delivery ${delivery.id}`,
      );
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown provider error';
      this.logger.error(
        `[Worker] Delivery failed for ${delivery.id} on attempt ${attemptNumber}: ${errorMessage}`,
      );

      // Step 7 & 8: Check retry eligibility
      const isFinal = attemptNumber >= MAX_DELIVERY_ATTEMPTS;

      if (!isFinal) {
        // Immediate retry without execution delay
        const nextRetryAt = new Date();

        await this.repo.recordDeliveryFailure({
          deliveryId: delivery.id,
          attemptNumber,
          errorMessage,
          isFinal: false,
          nextRetryAt,
        });

        // Re-enqueue retry immediately with 0 delay
        await this.queueService.enqueueDelivery(delivery.id, nextRetryAt, {
          overrideDelayMs: 0,
        });

        this.logger.log(
          `[Worker] Scheduled immediate retry (0ms delay) for delivery ${delivery.id} (attempt ${attemptNumber + 1}/${MAX_DELIVERY_ATTEMPTS})`,
        );
      } else {
        // Exhausted retries
        await this.repo.recordDeliveryFailure({
          deliveryId: delivery.id,
          attemptNumber,
          errorMessage: `Retries exhausted (${MAX_DELIVERY_ATTEMPTS}/${MAX_DELIVERY_ATTEMPTS}): ${errorMessage}`,
          isFinal: true,
        });

        this.logger.error(
          `[Worker] Max retry attempts (${MAX_DELIVERY_ATTEMPTS}) reached for delivery ${delivery.id}. Marked as FAILED.`,
        );
      }
    }
  }
}
