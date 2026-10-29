import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NotificationWorkerModule } from './notification-worker/notification-worker.module.js';

async function bootstrapWorker() {
  console.log('⚙️ Starting Notification Background Worker process...');
  const app = await NestFactory.createApplicationContext(
    NotificationWorkerModule,
  );
  app.enableShutdownHooks();
  console.log(
    '✅ Notification Background Worker is active and listening for jobs.',
  );
}

await bootstrapWorker();
