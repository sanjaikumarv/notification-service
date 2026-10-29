import { Injectable, Logger } from '@nestjs/common';
import { DevicesRepository, DeviceTokenRecord } from './devices.repository.js';
import type { RegisterDeviceDto } from './devices.dto.js';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private readonly repo: DevicesRepository) {}

  async registerDevice(dto: RegisterDeviceDto): Promise<DeviceTokenRecord> {
    this.logger.log(`Registering device token for platform ${dto.platform}`);
    return this.repo.upsertDeviceToken(dto);
  }

  async unregisterDevice(token: string): Promise<{ success: boolean }> {
    this.logger.log(`Deactivating device token`);
    const success = await this.repo.deactivateDeviceToken(token);
    return { success };
  }

  async listActiveDevices(userId?: string): Promise<DeviceTokenRecord[]> {
    return this.repo.findActiveTokens(userId);
  }
}

