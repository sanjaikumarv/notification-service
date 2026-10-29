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
import {
  RegisterDeviceSchema,
  UnregisterDeviceSchema,
} from './devices.dto.js';

@Controller('api/devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async registerDevice(@Body() body: unknown) {
    const parseResult = RegisterDeviceSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`,
      );
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed for device registration',
        errors: issues,
      });
    }

    const record = await this.devicesService.registerDevice(parseResult.data);
    return {
      statusCode: 200,
      message: 'Device token registered successfully',
      data: record,
    };
  }

  @Post('unregister')
  @HttpCode(HttpStatus.OK)
  async unregisterDevicePost(@Body() body: unknown) {
    return this.handleUnregister(body);
  }

  @Delete('unregister')
  @HttpCode(HttpStatus.OK)
  async unregisterDeviceDelete(@Body() body: unknown) {
    return this.handleUnregister(body);
  }

  private async handleUnregister(body: unknown) {
    const parseResult = UnregisterDeviceSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`,
      );
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed for device unregistration',
        errors: issues,
      });
    }

    const result = await this.devicesService.unregisterDevice(parseResult.data.token);
    return {
      statusCode: 200,
      message: result.success
        ? 'Device token deactivated'
        : 'Device token not found or already inactive',
      data: result,
    };
  }

  @Get()
  async listDevices(@Query('userId') userId?: string) {
    const devices = await this.devicesService.listActiveDevices(userId);
    return {
      statusCode: 200,
      data: devices,
    };
  }
}

