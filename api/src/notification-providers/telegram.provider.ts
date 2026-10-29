import { Injectable, Logger } from '@nestjs/common';
import type {
  NotificationProvider,
  SendNotificationInput,
  SendNotificationResult,
} from './notification-provider.interface.js';

@Injectable()
export class TelegramProvider implements NotificationProvider {
  private readonly logger = new Logger(TelegramProvider.name);

  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.error('TELEGRAM_BOT_TOKEN is not configured.');
      throw new Error(
        'Telegram bot token is not configured. Please set TELEGRAM_BOT_TOKEN in environment.',
      );
    }

    const chatId = input.recipient;
    const text = `*${this.escapeMarkdown(input.title)}*\n\n${this.escapeMarkdown(input.body)}`;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    this.logger.log(`Sending Telegram message to chat ${chatId}: "${input.title}"`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
      }),
    });

    const data = (await response.json()) as any;

    if (!response.ok || !data.ok) {
      const errorMsg = data.description || `HTTP error ${response.status}`;
      this.logger.error(`Telegram API error for chat ${chatId}: ${errorMsg}`);
      throw new Error(`Telegram API delivery failed: ${errorMsg}`);
    }

    const messageId = String(data.result?.message_id ?? 'unknown');
    this.logger.log(
      `Telegram message sent successfully to chat ${chatId}. Message ID: ${messageId}`,
    );

    return {
      providerMessageId: messageId,
    };
  }

  private escapeMarkdown(text: string): string {
    // Escapes Telegram MarkdownV2 special characters: _ * [ ] ( ) ~ ` > # + - = | { } . !
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
  }
}

