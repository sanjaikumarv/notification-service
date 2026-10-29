import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrapWorker() {
  console.log('⚙️ Starting Notification Background Worker process...');
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  console.log('✅ Notification Background Worker is active and listening for jobs.');
}

await bootstrapWorker();

