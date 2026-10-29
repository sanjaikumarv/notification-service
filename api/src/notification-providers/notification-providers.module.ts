import { Module } from '@nestjs/common';
import { EmailProvider } from './email.provider.js';
import { PushProvider } from './push.provider.js';
import { TelegramProvider } from './telegram.provider.js';
import { NotificationProviderFactory } from './notification-provider.factory.js';

@Module({
  providers: [
    EmailProvider,
    PushProvider,
    TelegramProvider,
    NotificationProviderFactory,
  ],
  exports: [NotificationProviderFactory],
})
export class NotificationProvidersModule {}

