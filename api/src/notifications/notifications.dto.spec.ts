import { describe, it, expect } from 'vitest';
import {
  CreateNotificationSchema,
  isValidIanaTimezone,
  NotificationQuerySchema,
  UpdateNotificationSchema,
} from './notifications.dto.js';

describe('Notifications Validation & DTOs', () => {
  describe('isValidIanaTimezone', () => {
    it('accepts valid IANA timezones', () => {
      expect(isValidIanaTimezone('UTC')).toBe(true);
      expect(isValidIanaTimezone('America/New_York')).toBe(true);
      expect(isValidIanaTimezone('Asia/Kolkata')).toBe(true);
      expect(isValidIanaTimezone('Europe/London')).toBe(true);
    });

    it('rejects invalid timezones', () => {
      expect(isValidIanaTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidIanaTimezone('Mars/Olympus')).toBe(false);
      expect(isValidIanaTimezone('')).toBe(false);
    });
  });

  describe('CreateNotificationSchema', () => {
    const validPayload = {
      title: 'Interview POC Reminder',
      body: 'Your scheduled interview starts in 1 hour.',
      scheduled_at: new Date(Date.now() + 3600000).toISOString(),
      timezone: 'America/New_York',
      channels: [
        { channel: 'EMAIL' as const, recipient: 'engineer@example.com' },
        { channel: 'PUSH' as const, recipient: 'device-token-12345' },
        { channel: 'TELEGRAM' as const, recipient: '123456789' },
      ],
    };

    it('passes for valid complete notification input', () => {
      const result = CreateNotificationSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('fails when title is empty or missing', () => {
      const result = CreateNotificationSchema.safeParse({
        ...validPayload,
        title: '   ',
      });
      expect(result.success).toBe(false);
    });

    it('fails when body is empty or missing', () => {
      const result = CreateNotificationSchema.safeParse({
        ...validPayload,
        body: '',
      });
      expect(result.success).toBe(false);
    });

    it('fails when scheduled_at is not a valid datetime', () => {
      const result = CreateNotificationSchema.safeParse({
        ...validPayload,
        scheduled_at: 'not-a-datetime',
      });
      expect(result.success).toBe(false);
    });

    it('fails when timezone is invalid', () => {
      const result = CreateNotificationSchema.safeParse({
        ...validPayload,
        timezone: 'Mars/Olympus',
      });
      expect(result.success).toBe(false);
    });

    it('fails when channels array is empty', () => {
      const result = CreateNotificationSchema.safeParse({
        ...validPayload,
        channels: [],
      });
      expect(result.success).toBe(false);
    });

    it('fails when email recipient format is invalid', () => {
      const result = CreateNotificationSchema.safeParse({
        ...validPayload,
        channels: [{ channel: 'EMAIL', recipient: 'invalid-email' }],
      });
      expect(result.success).toBe(false);
    });

    it('fails on duplicate channel and recipient combinations', () => {
      const result = CreateNotificationSchema.safeParse({
        ...validPayload,
        channels: [
          { channel: 'EMAIL', recipient: 'test@example.com' },
          { channel: 'EMAIL', recipient: 'test@example.com' },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateNotificationSchema', () => {
    it('allows partial updates with valid fields', () => {
      const result = UpdateNotificationSchema.safeParse({
        title: 'Updated Title',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('NotificationQuerySchema', () => {
    it('coerces and applies defaults for pagination', () => {
      const result = NotificationQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('filters by status', () => {
      const result = NotificationQuerySchema.safeParse({ status: 'PENDING' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('PENDING');
      }
    });

    it('transforms status ALL to undefined', () => {
      const result = NotificationQuerySchema.safeParse({ status: 'ALL' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBeUndefined();
      }
    });
  });
});

