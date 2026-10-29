import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import {
  CreateNotificationSchema,
  NotificationQuerySchema,
  SendTestEmailSchema,
  UpdateNotificationSchema,
} from './notifications.dto.js';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(@Body() body: unknown) {
    const parseResult = SendTestEmailSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`,
      );
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed for test email',
        errors: issues,
      });
    }

    const { to, recipient, subject, title, body: textBody, text } = parseResult.data;
    const targetEmail = (to || recipient)!;
    const emailSubject = subject || title || 'Test Email from EC Learnix';
    const emailBody =
      textBody ||
      text ||
      'Hello! This is a test email sent from the Scheduled Notifications local testing API.';

    try {
      const result = await this.notificationsService.sendTestEmail({
        to: targetEmail,
        subject: emailSubject,
        body: emailBody,
      });

      return {
        statusCode: 200,
        message: 'Test email sent successfully',
        data: result,
      };
    } catch (err: any) {
      throw new BadRequestException({
        statusCode: 400,
        message: `Failed to send test email: ${err?.message || 'SMTP delivery failure'}`,
      });
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown) {
    const parseResult = CreateNotificationSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`,
      );
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: issues,
      });
    }

    const notification = await this.notificationsService.create(parseResult.data);
    return {
      statusCode: 201,
      message: 'Notification scheduled successfully',
      data: notification,
    };
  }

  @Get()
  async findAll(@Query() queryParams: unknown) {
    const parseResult = NotificationQuerySchema.safeParse(queryParams);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`,
      );
      throw new BadRequestException({
        statusCode: 400,
        message: 'Invalid query parameters',
        errors: issues,
      });
    }

    return this.notificationsService.findAll(parseResult.data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const notification = await this.notificationsService.findOne(id);
    return {
      statusCode: 200,
      data: notification,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const parseResult = UpdateNotificationSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`,
      );
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: issues,
      });
    }

    const updated = await this.notificationsService.update(id, parseResult.data);
    return {
      statusCode: 200,
      message: 'Notification updated successfully',
      data: updated,
    };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string) {
    const cancelled = await this.notificationsService.cancel(id);
    return {
      statusCode: 200,
      message: 'Notification cancelled successfully',
      data: cancelled,
    };
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  async retry(@Param('id') id: string) {
    const result = await this.notificationsService.retry(id);
    return {
      statusCode: 200,
      message: result.message,
      data: { retriedCount: result.retriedCount },
    };
  }

  @Post(':id/deliveries/:deliveryId/retry')
  @HttpCode(HttpStatus.OK)
  async retryDelivery(
    @Param('id') id: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    const result = await this.notificationsService.retry(id, deliveryId);
    return {
      statusCode: 200,
      message: result.message,
      data: { retriedCount: result.retriedCount },
    };
  }

  @Get(':id/deliveries')
  async getDeliveries(@Param('id') id: string) {
    const deliveries = await this.notificationsService.getDeliveries(id);
    return {
      statusCode: 200,
      data: deliveries,
    };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteAll() {
    const result = await this.notificationsService.deleteAll();
    return {
      statusCode: 200,
      message: `Successfully deleted ${result.deletedCount} notification record(s) and cleared queue jobs`,
      data: result,
    };
  }

  @Delete('all')
  @HttpCode(HttpStatus.OK)
  async deleteAllAlias() {
    return this.deleteAll();
  }
}

