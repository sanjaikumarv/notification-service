import { Module } from '@nestjs/common';
import { NotificationProcessor } from './notification.processor.js';
import { NotificationsRepository } from '../notifications/notifications.repository.js';
import { NotificationProvidersModule } from '../notification-providers/notification-providers.module.js';
import { NotificationQueueModule } from '../notification-queue/notification-queue.module.js';

@Module({
  imports: [
    NotificationProvidersModule,
    NotificationQueueModule,
  ],
  providers: [NotificationProcessor, NotificationsRepository],
  exports: [NotificationProcessor],
})
export class NotificationWorkerModule {}

