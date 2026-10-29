import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface DeliveryJobData {
  deliveryId: string;
}

export const NOTIFICATIONS_QUEUE_NAME = 'notifications';

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE_NAME)
    private readonly queue: Queue<DeliveryJobData>,
  ) {}

  async enqueueDelivery(
    deliveryId: string,
    scheduledAt: Date,
    options?: { overrideDelayMs?: number },
  ): Promise<string> {
    const now = Date.now();
    const targetTime = scheduledAt.getTime();
    const delay =
      options?.overrideDelayMs !== undefined
        ? options.overrideDelayMs
        : Math.max(0, targetTime - now);

    const jobId = `delivery-${deliveryId}`;

    try {
      const existing = await this.queue.getJob(jobId);
      if (existing) {
        const state = await existing.getState();
        if (state !== 'active') {
          await existing.remove();
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not clean previous job ${jobId}: ${err.message}`);
    }

    this.logger.log(
      `Enqueueing BullMQ job ${jobId} with delay of ${delay}ms (target: ${scheduledAt.toISOString()})`,
    );

    const job = await this.queue.add(
      'send-delivery',
      { deliveryId },
      {
        jobId,
        delay,
        attempts: 4,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return job.id!;
  }

  async retryDeliveryJob(deliveryId: string): Promise<boolean> {
    const jobId = `delivery-${deliveryId}`;
    try {
      const job = await this.queue.getJob(jobId);
      if (job) {
        const state = await job.getState();
        if (state === 'failed') {
          await job.retry();
          this.logger.log(`Retried failed BullMQ job ${jobId}`);
          return true;
        }
        await job.remove();
      }
    } catch (err: any) {
      this.logger.warn(`Could not retry BullMQ job ${jobId}: ${err.message}`);
    }
    return false;
  }

  async removeDelivery(deliveryId: string): Promise<void> {
    const jobId = `delivery-${deliveryId}`;
    try {
      const job = await this.queue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`Removed job ${jobId} from queue`);
      }
    } catch (err: any) {
      this.logger.warn(`Could not remove job ${jobId}: ${err.message}`);
    }
  }

  async isJobActiveOrDelayed(deliveryId: string): Promise<boolean> {
    const jobId = `delivery-${deliveryId}`;
    try {
      const job = await this.queue.getJob(jobId);
      if (!job) return false;
      const state = await job.getState();
      return state === 'delayed' || state === 'waiting' || state === 'active';
    } catch {
      return false;
    }
  }

  async clearAllJobs(): Promise<void> {
    try {
      await this.queue.drain(true);
      await this.queue.clean(0, 1000, 'completed');
      await this.queue.clean(0, 1000, 'failed');
      await this.queue.clean(0, 1000, 'delayed');
      await this.queue.clean(0, 1000, 'wait');
      this.logger.log('Drained and cleaned all BullMQ jobs');
    } catch (err: any) {
      this.logger.warn(`Could not clear BullMQ jobs: ${err.message}`);
    }
  }
}

