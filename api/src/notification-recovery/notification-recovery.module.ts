import { Module } from '@nestjs/common';
import { NotificationRecoveryService } from './notification-recovery.service.js';
import { NotificationsRepository } from '../notifications/notifications.repository.js';
import { NotificationQueueModule } from '../notification-queue/notification-queue.module.js';

@Module({
  imports: [NotificationQueueModule],
  providers: [NotificationRecoveryService, NotificationsRepository],
  exports: [NotificationRecoveryService],
})
export class NotificationRecoveryModule {}

