import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { EmailProvider } from './email.provider.js';
import { TelegramProvider } from './telegram.provider.js';
import { PushProvider } from './push.provider.js';
import { NotificationProviderFactory } from './notification-provider.factory.js';

describe('Notification Providers', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
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

    it('falls back to mock push if PUSH_PROVIDER is "fcm" but credentials are missing', async () => {
      process.env.PUSH_PROVIDER = 'fcm';
      delete process.env.FCM_PROJECT_ID;
      delete process.env.FCM_CLIENT_EMAIL;
      delete process.env.FCM_PRIVATE_KEY;

      const provider = new PushProvider();
      const result = await provider.send({
        recipient: 'test-device-token',
        title: 'Alert',
        body: 'Fallback message',
        idempotencyKey: 'idemp-fallback',
      });

      expect(result.isMock).toBe(true);
      expect(result.providerMessageId).toMatch(/^mock-push-/);
    });

    it('successfully dispatches FCM v1 push notification with OAuth2 authentication', async () => {
      const { privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      process.env.PUSH_PROVIDER = 'fcm';
      process.env.FCM_PROJECT_ID = 'test-firebase-proj';
      process.env.FCM_CLIENT_EMAIL = 'test-fcm@test-firebase-proj.iam.gserviceaccount.com';
      process.env.FCM_PRIVATE_KEY = privateKey;

      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url === 'https://oauth2.googleapis.com/token') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              access_token: 'mock-google-oauth2-access-token',
              expires_in: 3600,
            }),
          };
        }
        if (url.includes('fcm.googleapis.com')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              name: 'projects/test-firebase-proj/messages/fcm-msg-unique-id-999',
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      global.fetch = mockFetch as any;

      const provider = new PushProvider();
      const result = await provider.send({
        recipient: 'valid-fcm-device-registration-token',
        title: 'Meeting Notice',
        body: 'Sprint planning at 10 AM',
        idempotencyKey: 'idemp-fcm-1',
      });

      expect(result.isMock).toBe(false);
      expect(result.providerMessageId).toBe('fcm-msg-unique-id-999');
      expect(mockFetch).toHaveBeenCalledTimes(2); // 1 token request + 1 message send
    });

    it('throws permanent error when FCM token is UNREGISTERED', async () => {
      const { privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      process.env.PUSH_PROVIDER = 'fcm';
      process.env.FCM_PROJECT_ID = 'test-firebase-proj';
      process.env.FCM_CLIENT_EMAIL = 'test-fcm@test-firebase-proj.iam.gserviceaccount.com';
      process.env.FCM_PRIVATE_KEY = privateKey;

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url === 'https://oauth2.googleapis.com/token') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              access_token: 'mock-access-token',
              expires_in: 3600,
            }),
          };
        }
        return {
          ok: false,
          status: 404,
          json: async () => ({
            error: {
              status: 'NOT_FOUND',
              message: 'Requested entity was not found.',
              details: [
                {
                  '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError',
                  errorCode: 'UNREGISTERED',
                },
              ],
            },
          }),
        };
      }) as any;

      const provider = new PushProvider();

      await expect(
        provider.send({
          recipient: 'expired-or-uninstalled-token',
          title: 'Alert',
          body: 'Hello',
          idempotencyKey: 'idemp-unreg',
        }),
      ).rejects.toThrow('FCM permanent failure: Token is invalid or expired [UNREGISTERED]');
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

