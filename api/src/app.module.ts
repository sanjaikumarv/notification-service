import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { RedisModule } from './redis/redis.module.js';
import { NotificationProvidersModule } from './notification-providers/notification-providers.module.js';
import { NotificationQueueModule } from './notification-queue/notification-queue.module.js';
import { NotificationWorkerModule } from './notification-worker/notification-worker.module.js';
import { NotificationRecoveryModule } from './notification-recovery/notification-recovery.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { DevicesModule } from './devices/devices.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'api',
    }),
    DatabaseModule,
    RedisModule,
    NotificationProvidersModule,
    NotificationQueueModule,
    NotificationsModule,
    DevicesModule,
    NotificationWorkerModule,
    NotificationRecoveryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
