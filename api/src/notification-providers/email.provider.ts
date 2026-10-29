import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import type {
  NotificationProvider,
  SendNotificationInput,
  SendNotificationResult,
} from './notification-provider.interface.js';

@Injectable()
export class EmailProvider implements NotificationProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private transporter: Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
    }
  }

  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.logger.error('SMTP_HOST is not configured.');
      throw new Error('SMTP host is not configured. Please set SMTP_HOST in environment.');
    }

    if (!this.transporter) {
      this.initTransporter();
    }

    if (!this.transporter) {
      throw new Error('Unable to initialize Nodemailer transporter.');
    }

    const from = process.env.SMTP_FROM || 'EC Learnix <notifications@ec-learnix.local>';

    this.logger.log(`Sending email to ${input.recipient}: "${input.title}"`);

    const info = await this.transporter.sendMail({
      from,
      to: input.recipient,
      subject: input.title,
      text: input.body,
      headers: {
        'X-Idempotency-Key': input.idempotencyKey,
      },
    });

    this.logger.log(`Email sent successfully to ${input.recipient}. Message ID: ${info.messageId}`);

    return {
      providerMessageId: info.messageId,
    };
  }
}
