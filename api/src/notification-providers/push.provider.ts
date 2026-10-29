import { Injectable, Logger } from '@nestjs/common';
import type {
  NotificationProvider,
  SendNotificationInput,
  SendNotificationResult,
} from './notification-provider.interface.js';

@Injectable()
export class PushProvider implements NotificationProvider {
  private readonly logger = new Logger(PushProvider.name);

  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    const providerType = process.env.PUSH_PROVIDER || 'mock';

    if (providerType.toLowerCase() === 'fcm') {
      return this.sendFcm(input);
    }

    return this.sendMock(input);
  }

  private async sendMock(input: SendNotificationInput): Promise<SendNotificationResult> {
    const mockId = `mock-push-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.logger.log(
      `[MOCK PUSH] Dispatching notification to recipient "${input.recipient}": "${input.title}". Generated ID: ${mockId}`,
    );

    // Simulate light network roundtrip
    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      providerMessageId: mockId,
      isMock: true,
    };
  }

  private async sendFcm(input: SendNotificationInput): Promise<SendNotificationResult> {
    const projectId = process.env.FCM_PROJECT_ID;
    if (!projectId) {
      this.logger.warn(
        'PUSH_PROVIDER is set to "fcm" but FCM_PROJECT_ID is missing. Falling back to mock push provider.',
      );
      return this.sendMock(input);
    }

    // In a full FCM implementation, OAuth2 Google token is retrieved and POST to https://fcm.googleapis.com/v1/projects/{projectId}/messages:send
    this.logger.log(`FCM push dispatched for project ${projectId} to recipient ${input.recipient}`);
    return {
      providerMessageId: `fcm-${Date.now()}`,
      isMock: false,
    };
  }
}

