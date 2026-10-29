import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { NotificationsRepository } from '../notifications/notifications.repository.js';
import { NotificationQueueService } from '../notification-queue/notification-queue.service.js';

@Injectable()
export class NotificationRecoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationRecoveryService.name);
  private intervalTimer: NodeJS.Timeout | null = null;
  private isRecovering = false;

  constructor(
    private readonly repo: NotificationsRepository,
    private readonly queueService: NotificationQueueService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing Notification Recovery Service...');

    // Trigger initial recovery shortly after startup
    setTimeout(() => {
      this.reconcileOverdueDeliveries().catch((err) => {
        this.logger.error(`Initial recovery failed: ${err.message}`);
      });
    }, 3000);

    // Run reconciliation periodically every 30 seconds
    this.intervalTimer = setInterval(() => {
      this.reconcileOverdueDeliveries().catch((err) => {
        this.logger.error(`Periodic recovery failed: ${err.message}`);
      });
    }, 30000);
  }

  onModuleDestroy() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  /**
   * PostgreSQL is the source of truth.
   * If Redis was restarted, or network partitioned when enqueuing, this recovers overdue pending deliveries.
   */
  async reconcileOverdueDeliveries(): Promise<number> {
    if (this.isRecovering) {
      return 0;
    }

    this.isRecovering = true;
    let recoveredCount = 0;

    try {
      const overdueDeliveries = await this.repo.findOverduePendingDeliveries();

      if (overdueDeliveries.length > 0) {
        this.logger.log(
          `Found ${overdueDeliveries.length} overdue/unprocessed delivery candidate(s). Checking queue state...`,
        );
      }

      for (const item of overdueDeliveries) {
        const isActive = await this.queueService.isJobActiveOrDelayed(
          item.delivery_id,
        );

        if (!isActive) {
          this.logger.warn(
            `Recovering delivery ${item.delivery_id} (${item.channel} -> ${item.recipient}): Job missing in Redis. Re-enqueuing...`,
          );

          // Deliveries are overdue, so schedule immediately with 0 delay
          await this.queueService.enqueueDelivery(
            item.delivery_id,
            new Date(item.scheduled_at),
            { overrideDelayMs: 0 },
          );

          recoveredCount++;
        }
      }

      if (recoveredCount > 0) {
        this.logger.log(`Successfully recovered and re-enqueued ${recoveredCount} jobs.`);
      }
    } catch (err: any) {
      this.logger.error(`Error during recovery reconciliation: ${err.message}`);
    } finally {
      this.isRecovering = false;
    }

    return recoveredCount;
  }
}

