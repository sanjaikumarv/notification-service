import { z } from 'zod';

export function isValidIanaTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const ChannelRecipientSchema = z.object({
  channel: z.enum(['EMAIL', 'PUSH', 'TELEGRAM']),
  recipient: z.string().trim().min(1, 'Recipient cannot be empty'),
}).superRefine((data, ctx) => {
  if (data.channel === 'EMAIL') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.recipient)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipient'],
        message: 'Invalid email address format',
      });
    }
  }
});

export const CreateNotificationSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255, 'Title exceeds 255 characters'),
  body: z.string().trim().min(1, 'Message body is required'),
  scheduled_at: z.string().datetime({ message: 'scheduled_at must be a valid ISO-8601 date-time string' }),
  timezone: z.string().trim().refine(isValidIanaTimezone, {
    message: 'Invalid IANA timezone (e.g., "America/New_York", "UTC", "Asia/Kolkata")',
  }),
  channels: z
    .array(ChannelRecipientSchema)
    .min(1, 'At least one notification channel must be selected')
    .refine(
      (items) => {
        const set = new Set();
        for (const item of items) {
          const key = `${item.channel}:${item.recipient.toLowerCase()}`;
          if (set.has(key)) return false;
          set.add(key);
        }
        return true;
      },
      { message: 'Duplicate channel and recipient combinations are not allowed' },
    ),
});

export type CreateNotificationDto = z.infer<typeof CreateNotificationSchema>;

export const UpdateNotificationSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  body: z.string().trim().min(1).optional(),
  scheduled_at: z.string().datetime().optional(),
  timezone: z.string().trim().refine(isValidIanaTimezone, {
    message: 'Invalid IANA timezone',
  }).optional(),
});

export type UpdateNotificationDto = z.infer<typeof UpdateNotificationSchema>;

export const NotificationQuerySchema = z.object({
  status: z
    .enum(['ALL', 'PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED'])
    .optional()
    .transform((val) => (val === 'ALL' || !val ? undefined : val)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type NotificationQueryDto = z.infer<typeof NotificationQuerySchema>;

export const SendTestEmailSchema = z
  .object({
    to: z.string().trim().email('Invalid email address format').optional(),
    recipient: z.string().trim().email('Invalid email address format').optional(),
    subject: z.string().trim().min(1).max(255).optional(),
    title: z.string().trim().min(1).max(255).optional(),
    body: z.string().trim().min(1).optional(),
    text: z.string().trim().min(1).optional(),
  })
  .refine((data) => data.to || data.recipient, {
    message: 'Recipient email address is required (provide "to" or "recipient")',
    path: ['to'],
  });

export type SendTestEmailDto = z.infer<typeof SendTestEmailSchema>;
