export interface SendNotificationInput {
  recipient: string;
  title: string;
  body: string;
  idempotencyKey: string;
}

export interface SendNotificationResult {
  providerMessageId?: string;
  isMock?: boolean;
}

export interface NotificationProvider {
  send(input: SendNotificationInput): Promise<SendNotificationResult>;
}

