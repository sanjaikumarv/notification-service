import { Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import type {
  NotificationProvider,
  SendNotificationInput,
  SendNotificationResult,
} from './notification-provider.interface.js';

interface CachedToken {
  token: string;
  expiresAt: number;
}

@Injectable()
export class PushProvider implements NotificationProvider {
  private readonly logger = new Logger(PushProvider.name);
  private cachedToken: CachedToken | null = null;

  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    const providerType = process.env.PUSH_PROVIDER || 'mock';

    if (providerType.toLowerCase() === 'fcm') {
      return this.sendFcm(input);
    }

    return this.sendMock(input);
  }

  private async sendMock(
    input: SendNotificationInput,
  ): Promise<SendNotificationResult> {
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

  private async sendFcm(
    input: SendNotificationInput,
  ): Promise<SendNotificationResult> {
    const projectId = process.env.FCM_PROJECT_ID;
    const clientEmail = process.env.FCM_CLIENT_EMAIL;
    const privateKey = process.env.FCM_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'PUSH_PROVIDER is set to "fcm" but FCM credentials (FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY) are incomplete. Falling back to mock push provider.',
      );
      return this.sendMock(input);
    }

    // Automatically simulate test/mock tokens to prevent Google FCM INVALID_ARGUMENT errors
    const recipient = input.recipient.trim();
    if (
      recipient.startsWith('mock-') ||
      recipient.startsWith('web-fcm-') ||
      recipient.includes('mock') ||
      recipient === 'test-device-token'
    ) {
      this.logger.log(
        `[MOCK PUSH] Recipient "${recipient}" is a test/placeholder token. Dispatching mock push receipt. (To receive live push notifications on your device, provide a genuine FCM registration token issued by Firebase SDK).`,
      );
      return this.sendMock(input);
    }

    const accessToken = await this.getAccessToken(clientEmail, privateKey);
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    const webUrl = process.env.WEB_URL || 'http://localhost:3000';

    const payload = {
      message: {
        token: input.recipient,
        notification: {
          title: input.title,
          body: input.body,
        },
        data: {
          idempotencyKey: input.idempotencyKey,
          title: input.title,
          body: input.body,
        },
        webpush: {
          headers: {
            Urgency: 'high',
          },
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
          },
          fcm_options: {
            link: webUrl,
          },
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channel_id: 'default_channel',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              alert: {
                title: input.title,
                body: input.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      },
    };

    this.logger.log(
      `Sending FCM HTTP v1 push notification to recipient: ${input.recipient.slice(0, 15)}... (Project: ${projectId})`,
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => null)) as any;

    if (!response.ok) {
      const errorDetails = data?.error?.details || [];
      const fcmErrorDetail = errorDetails.find((d: any) =>
        d['@type']?.includes('FcmError'),
      );
      const errorCode = fcmErrorDetail?.errorCode || data?.error?.status || `HTTP_${response.status}`;
      const errorMessage = data?.error?.message || response.statusText;

      this.logger.error(
        `FCM API error for recipient ${input.recipient.slice(0, 15)}...: [${errorCode}] ${errorMessage}`,
      );

      // Handle permanent errors (invalid or unregistered token)
      if (
        errorCode === 'UNREGISTERED' ||
        errorCode === 'INVALID_ARGUMENT' ||
        errorCode === 'SENDER_ID_MISMATCH'
      ) {
        throw new Error(
          `FCM permanent failure: Token is invalid or expired [${errorCode}]. ${errorMessage}`,
        );
      }

      // Transient errors (QUOTA_EXCEEDED, UNAVAILABLE, INTERNAL) trigger retries
      throw new Error(`FCM delivery failed: [${errorCode}] ${errorMessage}`);
    }

    // FCM returns "projects/{projectId}/messages/{messageId}"
    const fullName = data?.name || '';
    const messageId = fullName.includes('/') ? fullName.split('/').pop() : `fcm-${Date.now()}`;

    this.logger.log(
      `FCM push dispatched successfully to recipient ${input.recipient.slice(0, 15)}... Message ID: ${messageId}`,
    );

    return {
      providerMessageId: messageId,
      isMock: false,
    };
  }

  /**
   * Retrieves a cached Google OAuth2 access token or mints a new one via RS256 JWT assertion.
   */
  private async getAccessToken(
    clientEmail: string,
    rawPrivateKey: string,
  ): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now) {
      return this.cachedToken.token;
    }

    // Format PEM private key in case newlines were escaped
    const formattedPrivateKey = rawPrivateKey.replace(/\\n/g, '\n');

    const iat = Math.floor(now / 1000);
    const exp = iat + 3600; // 1 hour validity

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const claimSet = {
      iss: clientEmail,
      sub: clientEmail,
      aud: 'https://oauth2.googleapis.com/token',
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      iat,
      exp,
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const claimSetB64 = Buffer.from(JSON.stringify(claimSet)).toString('base64url');
    const unsignedJwt = `${headerB64}.${claimSetB64}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedJwt);
    signer.end();

    const signatureB64 = signer.sign(formattedPrivateKey, 'base64url');
    const assertion = `${unsignedJwt}.${signatureB64}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    const tokenData = (await tokenResponse.json().catch(() => null)) as any;

    if (!tokenResponse.ok || !tokenData?.access_token) {
      const errDescription =
        tokenData?.error_description || tokenData?.error || `HTTP ${tokenResponse.status}`;
      this.logger.error(`Failed to exchange Google OAuth2 token: ${errDescription}`);
      throw new Error(`Google OAuth2 authentication failed for FCM: ${errDescription}`);
    }

    // Cache token with 5-minute safety buffer
    const expiresIn = Number(tokenData.expires_in) || 3600;
    this.cachedToken = {
      token: tokenData.access_token,
      expiresAt: now + (expiresIn - 300) * 1000,
    };

    return this.cachedToken.token;
  }
}
