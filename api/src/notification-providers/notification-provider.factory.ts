import { Injectable } from '@nestjs/common';
import type { NotificationProvider } from './notification-provider.interface.js';
import { EmailProvider } from './email.provider.js';
import { PushProvider } from './push.provider.js';
import { TelegramProvider } from './telegram.provider.js';

@Injectable()
export class NotificationProviderFactory {
  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly pushProvider: PushProvider,
    private readonly telegramProvider: TelegramProvider,
  ) {}

  getProvider(channel: string): NotificationProvider {
    switch (channel.toUpperCase()) {
      case 'EMAIL':
        return this.emailProvider;
      case 'PUSH':
        return this.pushProvider;
      case 'TELEGRAM':
        return this.telegramProvider;
      default:
        throw new Error(`Unsupported notification channel: "${channel}"`);
    }
  }
}

