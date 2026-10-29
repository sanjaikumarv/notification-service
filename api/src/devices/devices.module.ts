import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { DevicesController } from './devices.controller.js';
import { DevicesRepository } from './devices.repository.js';
import { DevicesService } from './devices.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [DevicesController],
  providers: [DevicesRepository, DevicesService],
  exports: [DevicesService, DevicesRepository],
})
export class DevicesModule {}

