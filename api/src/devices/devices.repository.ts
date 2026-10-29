import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

export interface DeviceTokenRecord {
  id: string;
  user_id: string | null;
  token: string;
  platform: 'WEB' | 'ANDROID' | 'IOS';
  device_name: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class DevicesRepository {
  private readonly logger = new Logger(DevicesRepository.name);

  constructor(private readonly db: DatabaseService) {}

  async upsertDeviceToken(params: {
    token: string;
    platform: 'WEB' | 'ANDROID' | 'IOS';
    deviceName?: string;
    userId?: string;
  }): Promise<DeviceTokenRecord> {
    const result = await this.db.query<DeviceTokenRecord>(
      `INSERT INTO device_tokens (token, platform, device_name, user_id, is_active, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW())
       ON CONFLICT (token) DO UPDATE
       SET platform = EXCLUDED.platform,
           device_name = COALESCE(EXCLUDED.device_name, device_tokens.device_name),
           user_id = COALESCE(EXCLUDED.user_id, device_tokens.user_id),
           is_active = TRUE,
           updated_at = NOW()
       RETURNING *`,
      [params.token, params.platform, params.deviceName ?? null, params.userId ?? null],
    );

    return result.rows[0];
  }

  async deactivateDeviceToken(token: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE device_tokens
       SET is_active = FALSE, updated_at = NOW()
       WHERE token = $1`,
      [token],
    );

    return (result.rowCount ?? 0) > 0;
  }

  async findActiveTokens(userId?: string): Promise<DeviceTokenRecord[]> {
    if (userId) {
      const result = await this.db.query<DeviceTokenRecord>(
        `SELECT * FROM device_tokens
         WHERE is_active = TRUE AND user_id = $1
         ORDER BY updated_at DESC`,
        [userId],
      );
      return result.rows;
    }

    const result = await this.db.query<DeviceTokenRecord>(
      `SELECT * FROM device_tokens
       WHERE is_active = TRUE
       ORDER BY updated_at DESC
       LIMIT 50`,
    );
    return result.rows;
  }
}

