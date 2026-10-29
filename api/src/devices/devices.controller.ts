import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { DevicesService } from './devices.service.js';
import { RegisterDeviceSchema, UnregisterDeviceSchema } from './devices.dto.js';

@Controller('api/devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async registerDevice(@Body() body: unknown) {
    const parsed = RegisterDeviceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed for device registration',
        errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      });
    }

    const data = await this.devicesService.registerDevice(parsed.data);
    return { statusCode: 200, message: 'Device token registered', data };
  }

  @Post('unregister')
  @Delete('unregister')
  @HttpCode(HttpStatus.OK)
  async unregisterDevice(@Body() body: unknown) {
    const parsed = UnregisterDeviceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed for device unregistration',
        errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      });
    }

    const data = await this.devicesService.unregisterDevice(parsed.data.token);
    return { statusCode: 200, message: 'Device token deactivated', data };
  }

  @Get()
  async listDevices(@Query('userId') userId?: string) {
    const data = await this.devicesService.listActiveDevices(userId);
    return { statusCode: 200, data };
  }
}
