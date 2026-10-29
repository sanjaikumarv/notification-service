import { z } from 'zod';

export const RegisterDeviceSchema = z.object({
  token: z.string().trim().min(10, 'FCM registration token must be at least 10 characters'),
  platform: z.enum(['WEB', 'ANDROID', 'IOS']),
  deviceName: z.string().trim().max(255).optional(),
  userId: z.string().trim().max(255).optional(),
});

export type RegisterDeviceDto = z.infer<typeof RegisterDeviceSchema>;

export const UnregisterDeviceSchema = z.object({
  token: z.string().trim().min(1, 'Token is required'),
});

export type UnregisterDeviceDto = z.infer<typeof UnregisterDeviceSchema>;

