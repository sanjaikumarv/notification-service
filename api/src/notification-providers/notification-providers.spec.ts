import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EmailProvider } from './email.provider.js';
import { TelegramProvider } from './telegram.provider.js';
import { PushProvider } from './push.provider.js';
import { NotificationProviderFactory } from './notification-provider.factory.js';

describe('Notification Providers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('EmailProvider', () => {
    it('throws when SMTP_HOST is not configured', async () => {
      delete process.env.SMTP_HOST;
      const provider = new EmailProvider();

      await expect(
        provider.send({
          recipient: 'test@example.com',
          title: 'Hello',
          body: 'World',
          idempotencyKey: 'idemp-1',
        }),
      ).rejects.toThrow('SMTP host is not configured');
    });
  });

  describe('TelegramProvider', () => {
    it('throws when TELEGRAM_BOT_TOKEN is not configured', async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      const provider = new TelegramProvider();

      await expect(
        provider.send({
          recipient: '123456789',
          title: 'Hello',
          body: 'World',
          idempotencyKey: 'idemp-2',
        }),
      ).rejects.toThrow('Telegram bot token is not configured');
    });
  });

  describe('PushProvider', () => {
    it('dispatches mock push by default with mock ID and flag', async () => {
      process.env.PUSH_PROVIDER = 'mock';
      const provider = new PushProvider();

      const result = await provider.send({
        recipient: 'device-fcm-mock-token',
        title: 'Mock Push Alert',
        body: 'This is a test push',
        idempotencyKey: 'idemp-3',
      });

      expect(result.isMock).toBe(true);
      expect(result.providerMessageId).toMatch(/^mock-push-/);
    });
  });

  describe('NotificationProviderFactory', () => {
    it('resolves correct provider by channel name', () => {
      const email = new EmailProvider();
      const push = new PushProvider();
      const telegram = new TelegramProvider();
      const factory = new NotificationProviderFactory(email, push, telegram);

      expect(factory.getProvider('EMAIL')).toBe(email);
      expect(factory.getProvider('PUSH')).toBe(push);
      expect(factory.getProvider('TELEGRAM')).toBe(telegram);
    });

    it('throws for unsupported channel', () => {
      const factory = new NotificationProviderFactory(
        new EmailProvider(),
        new PushProvider(),
        new TelegramProvider(),
      );

      expect(() => factory.getProvider('WHATSAPP')).toThrow(
        'Unsupported notification channel',
      );
    });
  });
});

