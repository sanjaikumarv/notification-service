import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  NotificationQueueService,
  NOTIFICATIONS_QUEUE_NAME,
} from './notification-queue.service.js';
import { RedisModule } from '../redis/redis.module.js';

@Module({
  imports: [
    RedisModule,
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE_NAME,
    }),
  ],
  providers: [NotificationQueueService],
  exports: [NotificationQueueService, BullModule],
})
export class NotificationQueueModule {}

