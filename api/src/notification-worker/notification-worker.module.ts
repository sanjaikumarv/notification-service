import { Module } from '@nestjs/common';
import { NotificationProcessor } from './notification.processor.js';
import { NotificationsRepository } from '../notifications/notifications.repository.js';
import { NotificationProvidersModule } from '../notification-providers/notification-providers.module.js';
import { NotificationQueueModule } from '../notification-queue/notification-queue.module.js';
import { DatabaseService } from '../database/database.service.js';
import { RedisModule } from '../redis/redis.module.js';

@Module({
  imports: [NotificationProvidersModule, NotificationQueueModule, RedisModule],

  providers: [NotificationProcessor, NotificationsRepository, DatabaseService],
  exports: [NotificationProcessor],
})
export class NotificationWorkerModule {}
