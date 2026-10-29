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

    const claim = await this.repo.claimDeliveryForProcessing(deliveryId);
    if (!claim) {
      return;
    }

    const { delivery, notification } = claim;

    if (notification.status === 'CANCELLED') {
      return;
    }

    const attemptNumber = delivery.attempt_count + 1;
    await this.repo.recordAttemptStart(delivery.id, attemptNumber);

    try {
      const provider = this.providerFactory.getProvider(delivery.channel);
      const idempotencyKey = `delivery-${delivery.id}-attempt-${attemptNumber}`;

      const result = await provider.send({
        recipient: delivery.recipient,
        title: notification.title,
        body: notification.body,
        idempotencyKey,
      });

      await this.repo.recordDeliverySuccess({
        deliveryId: delivery.id,
        attemptNumber,
        providerMessageId: result.providerMessageId,
      });

      this.logger.log(`Delivered ${delivery.channel} for delivery ${delivery.id}`);
    } catch (err: any) {
      const errorMessage = err?.message || 'Delivery error';
      this.logger.error(`Delivery failed for ${delivery.id} on attempt ${attemptNumber}: ${errorMessage}`);

      const isFinal = attemptNumber >= MAX_DELIVERY_ATTEMPTS;

      if (!isFinal) {
        const nextRetryAt = new Date();

        await this.repo.recordDeliveryFailure({
          deliveryId: delivery.id,
          attemptNumber,
          errorMessage,
          isFinal: false,
          nextRetryAt,
        });

        await this.queueService.enqueueDelivery(delivery.id, nextRetryAt, {
          overrideDelayMs: 0,
        });
      } else {
        await this.repo.recordDeliveryFailure({
          deliveryId: delivery.id,
          attemptNumber,
          errorMessage: `Retries exhausted (${MAX_DELIVERY_ATTEMPTS}/${MAX_DELIVERY_ATTEMPTS}): ${errorMessage}`,
          isFinal: true,
        });
      }
    }
  }
}
