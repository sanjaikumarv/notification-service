-- Migration 001: Initial Schema for Scheduled Notifications

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL
        CHECK (channel IN ('EMAIL', 'PUSH', 'TELEGRAM')),
    recipient VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ NULL,
    provider_message_id VARCHAR(255) NULL,
    last_error TEXT NULL,
    sent_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_notification_channel_recipient UNIQUE (notification_id, channel, recipient)
);

CREATE TABLE IF NOT EXISTS delivery_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES notification_deliveries(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    outcome VARCHAR(20) NOT NULL
        CHECK (outcome IN ('SUCCESS', 'RETRYING', 'FAILED')),
    error_message TEXT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_delivery_attempt_number UNIQUE (delivery_id, attempt_number)
);

-- Indexes for efficient queries and worker scheduling
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_status 
    ON notifications(scheduled_at, status);

CREATE INDEX IF NOT EXISTS idx_deliveries_notification_id 
    ON notification_deliveries(notification_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_status_retry 
    ON notification_deliveries(status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_delivery_attempts_delivery_id 
    ON delivery_attempts(delivery_id);

