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
    const user = process.env.SMTP_USER || process.env.NEXT_PUBLIC_SMTP_USER;

    const host = process.env.SMTP_HOST;
    const pass = process.env.SMTP_PASSWORD;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: user,
          pass: pass,
        },
      });
    } else if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure:
          process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: user && pass ? { user, pass } : undefined,
      });
    }
  }

  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.logger.error('SMTP host is not configured.');
      throw new Error(
        'SMTP host is not configured. Please set SMTP_HOST in environment.',
      );
    }

    if (!this.transporter) {
      this.initTransporter();
    }

    if (!this.transporter) {
      throw new Error('Unable to initialize Nodemailer transporter.');
    }

    const from =
      process.env.SMTP_FROM || 'EC Learnix <notifications@ec-learnix.local>';

    this.logger.log(`Sending email to ${input.recipient}: "${input.title}"`);
    await this.transporter.verify();
    const info = await this.transporter.sendMail({
      from,
      to: input.recipient,
      subject: input.title,
      text: input.body,
      headers: {
        'X-Idempotency-Key': input.idempotencyKey,
      },
    });

    this.logger.log(
      `Email sent successfully to ${input.recipient}. Message ID: ${info.messageId}`,
    );

    return {
      providerMessageId: info.messageId,
    };
  }
}
