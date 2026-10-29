# Scheduled Notifications Proof-of-Concept (POC)

A production-grade Scheduled Notifications system built with a **NestJS 12 backend** (native ESM, raw `pg` PostgreSQL, BullMQ, Redis) and a **Next.js 16 frontend** (App Router, React 19, Tailwind CSS v4).

The system provides atomic multi-channel scheduling, duplicate-processing prevention, zero-delay restart recovery, and fine-grained delivery attempt tracking.

---

## 1. Channel Integration Status

| Channel | Status | Implementation Details |
|---|---|---|
| **Email** | 🟢 **Fully Integrated & Active** | Dispatched via **Nodemailer** using standard SMTP authentication (Gmail App Password, Ethereal, Mailtrap, AWS SES). |
| **Push Notifications** | 🟢 **Fully Integrated (FCM v1 & Mock)** | Dispatched via **Firebase Cloud Messaging HTTP v1 API** with RS256 Service Account authentication (`FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`). Defaults to deterministic mock receipts when credentials are unset or `PUSH_PROVIDER=mock`. |
| **Telegram** | 🟡 **Architecture Ready (Pending Bot Credentials)** | The Telegram Bot API dispatcher (`sendMessage` via native `fetch`) is implemented and tested with error-handling/retries; live delivery requires a valid `TELEGRAM_BOT_TOKEN`. |

---

## 2. System Architecture

```mermaid
flowchart TD
    subgraph Frontend ["Next.js Frontend (Port 3000)"]
        Dashboard["Dashboard View (/)"]
        CreateForm["Create Notification (/create)"]
        DetailsView["Details & Delivery Logs (/notifications/:id)"]
    end

    subgraph BackendAPI ["NestJS API Server (Port 5000)"]
        Controller["NotificationsController (/api/notifications)"]
        Service["NotificationsService"]
        QueueService["NotificationQueueService"]
    end

    subgraph Database ["PostgreSQL 16 (Port 5432 - Raw pg)"]
        NotifTable[("notifications")]
        DelivTable[("notification_deliveries")]
        AttemptsTable[("delivery_attempts")]
    end

    subgraph Queue ["Redis 7 / BullMQ (Port 6379)"]
        RedisQueue[("Queue: notifications")]
    end

    subgraph WorkerProcess ["Worker Host (worker.ts or in-process)"]
        Processor["NotificationProcessor (WorkerHost)"]
        Factory["NotificationProviderFactory"]
        EmailProv["EmailProvider (Active SMTP / Nodemailer)"]
        PushProv["PushProvider (Mock Provider)"]
        TgProv["TelegramProvider (Pending Bot Token)"]
        Recovery["NotificationRecoveryService"]
    end

    CreateForm -->|POST /api/notifications| Controller
    Controller --> Service
    Service -->|Atomic Transaction: INSERT notification + deliveries| Database
    Service -->|Enqueue delayed jobs: delivery-UUID| RedisQueue

    RedisQueue -->|Pop jobs due for execution| Processor
    Processor -->|Atomic Claim: conditional UPDATE| DelivTable
    Processor --> Factory
    Factory --> EmailProv
    Factory --> PushProv
    Factory --> TgProv
    Processor -->|Record attempt start & result| AttemptsTable
    Processor -->|Update delivery status & last error| DelivTable

    Recovery -->|Poll overdue pending deliveries| Database
    Recovery -->|Re-enqueue missing jobs with 0ms delay| RedisQueue
```

---

## 3. Environment Variables Reference

### Backend (`api/.env`)

Create `api/.env` with the following variables:

```env
# ==============================================================================
# DATABASE (PostgreSQL - Raw 'pg' Pool)
# ==============================================================================
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/notifications_db

# ==============================================================================
# REDIS / BULLMQ QUEUE
# ==============================================================================
REDIS_URL=redis://127.0.0.1:6379

# ==============================================================================
# SERVER CONFIGURATION
# ==============================================================================
PORT=5000
WEB_URL=http://localhost:3000

# ==============================================================================
# EMAIL CONFIGURATION (SMTP / Nodemailer) - FULLY INTEGRATED
# ==============================================================================
# Sender address shown in the "From:" header
SMTP_FROM="EC Learnix <notifications@ec-learnix.local>"

# SMTP Server Credentials (e.g., Gmail SMTP with App Password, Ethereal, SES)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=devsanjaikumarv@gmail.com
SMTP_PASSWORD=your-app-password

# ==============================================================================
# TELEGRAM BOT API - PENDING BOT CREDENTIALS
# ==============================================================================
# Leave blank or set your bot token from @BotFather when ready
TELEGRAM_BOT_TOKEN=

# ==============================================================================
# PUSH NOTIFICATIONS - MOCK PROVIDER (DEFAULT)
# ==============================================================================
PUSH_PROVIDER=mock

# Optional FCM Configuration (used only if PUSH_PROVIDER=fcm in the future)
FCM_PROJECT_ID=
FCM_CLIENT_EMAIL=
FCM_PRIVATE_KEY=
```

#### Detailed Backend Variable Descriptions:

| Variable | Required? | Default / Example | Purpose |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | `postgresql://postgres:postgres@127.0.0.1:5432/notifications_db` | Connection string for PostgreSQL connection pool. |
| `REDIS_URL` | **Yes** | `redis://127.0.0.1:6379` | Redis host & port for BullMQ delayed queue. |
| `PORT` | **Yes** | `5000` | Port for the NestJS REST API server. |
| `WEB_URL` | No | `http://localhost:3000` | Allowed CORS origin for browser requests. |
| `SMTP_FROM` | **Yes** | `"EC Learnix <notifications@ec-learnix.local>"` | Outgoing sender identity. |
| `SMTP_HOST` | **Yes** | `smtp.gmail.com` | SMTP relay server hostname. |
| `SMTP_PORT` | No | `587` | SMTP port (typically 587 for TLS, 465 for SSL). |
| `SMTP_USER` | **Yes** | `devsanjaikumarv@gmail.com` | Email account username / address. |
| `SMTP_PASSWORD` | **Yes** | `your-app-password` | App password (e.g., Gmail App Password) or SMTP password. |
| `TELEGRAM_BOT_TOKEN` | Optional | `""` | Telegram Bot token from `@BotFather` (pending live bot integration). |
| `PUSH_PROVIDER` | No | `mock` | `mock` emits simulated receipts; `fcm` requires Firebase credentials. |

---

### Frontend (`web/.env`)

Create `web/.env` with the following variables:

```env
# URL of the NestJS Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000
```

| Variable | Required? | Default / Example | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Yes** | `http://localhost:5000` | Target URL for browser API calls to NestJS. |

---

## 4. Setup & Running Guide

### Step 1: Start PostgreSQL & Redis Infrastructure

Start local PostgreSQL (port 5432) and Redis (port 6379) using Docker Compose:

```bash
docker compose up -d
```

Verify that the containers are healthy:
```bash
docker compose ps
```

---

### Step 2: Backend Setup (`/api`)

Open a terminal and navigate to `/api`:

```bash
cd api

# 1. Install dependencies
pnpm install

# 2. Run raw SQL database migrations
pnpm run db:migrate

# 3. Run all unit and integration tests (34 tests across 6 suites)
pnpm run test

# 4. Start the NestJS API development server
pnpm run start:dev
```

The NestJS backend will start on **`http://localhost:5000`**.

> [!TIP]
> **Standalone Worker Process (Optional)**:
> In development, the BullMQ worker runs in-process inside `main.ts`. To run the worker in an independent dedicated process without an HTTP listener:
> ```bash
> pnpm run start:worker
> ```

---

### Step 3: Frontend Setup (`/web`)

Open a separate terminal and navigate to `/web`:

```bash
cd web

# 1. Install dependencies
pnpm install

# 2. Start the Next.js development server
pnpm run dev
```

Open your browser and navigate to **`http://localhost:3000`**.

---

## 5. Key Reliability Features

### 1. Strictly Raw PostgreSQL (Zero ORM)
- Built with raw parameterized queries using the official `pg` package (`pg.Pool`).
- Explicit connection pooling, isolation levels, and transactions (`BEGIN`, `COMMIT`, `ROLLBACK`).
- No ORMs (no Prisma, TypeORM, Sequelize, or Drizzle) ensuring complete SQL query control.

### 2. Dual-Layer Duplicate Processing Prevention
- **Deterministic BullMQ Job IDs**: Every job is enqueued with a deterministic ID: `delivery-${deliveryId}`. BullMQ will not create duplicate jobs for the same delivery.
- **Atomic Conditional Worker Claims**: Workers claim pending deliveries using conditional SQL:
  ```sql
  UPDATE notification_deliveries
  SET status = 'PROCESSING', updated_at = NOW()
  WHERE id = $1 AND status IN ('PENDING', 'FAILED')
  RETURNING *;
  ```
  If another concurrent worker already claimed or finished the delivery, the query returns 0 rows and the job safely exits.

### 3. Restart Recovery Engine (`NotificationRecoveryService`)
- PostgreSQL is the ultimate source of truth.
- If Redis restarts, drops delayed keys, or a worker crashes mid-flight, the `NotificationRecoveryService` detects overdue pending deliveries (`scheduled_at <= NOW()`) on startup (after 3s) and every 30 seconds, automatically re-enqueuing missing jobs with `0ms` delay.

### 4. Zero-Delay Immediate Retries & Immediate Dispatch
- **Immediate Failure Retries**: When an attempt fails due to a transient error, it re-enqueues immediately with `0ms` delay up to 4 max attempts.
- **Immediate Dispatch Mode**: Selecting the `⚡ Immediate` preset or clicking `⚡ Send Immediately` bypasses schedule delays and dispatches directly.
- **Manual Retry API**: Failed deliveries can be retried at any time from the UI or via REST API.

---

## 6. REST API Specification

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/notifications` | Create & schedule a notification across channels |
| `GET` | `/api/notifications` | List notifications with status filter (`ALL`, `PENDING`, `SENT`, `FAILED`) & pagination |
| `GET` | `/api/notifications/:id` | Get details and delivery summary for a notification |
| `PATCH` | `/api/notifications/:id` | Update title, body, or time of a pending notification |
| `POST` | `/api/notifications/:id/cancel` | Cancel an active pending notification |
| `POST` | `/api/notifications/:id/retry` | Re-enqueue and retry all failed deliveries of a notification |
| `POST` | `/api/notifications/:id/deliveries/:deliveryId/retry` | Retry an individual failed channel delivery |
| `POST` | `/api/notifications/test-email` | Send a direct test email locally via Nodemailer |
| `DELETE` | `/api/notifications` | Delete all notification records and clear all BullMQ queue jobs |
| `GET` | `/api/notifications/:id/deliveries` | Get per-channel delivery statuses and attempt history |
| `POST` | `/api/devices/register` | Register or update an active FCM device token (Web, Android, iOS) |
| `DELETE` | `/api/devices/unregister` | Deactivate an FCM device token |
| `GET` | `/api/devices` | List active registered device tokens |

---

## 7. Example `curl` Commands

### 1. Test Email Sending Locally
```bash
curl -X POST "http://localhost:5000/api/notifications/test-email" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "devsanjaikumarv@gmail.com",
    "subject": "Local SMTP Test",
    "body": "Testing local email dispatch via Nodemailer."
  }'
```

### 2. Schedule a Multi-Channel Notification
```bash
curl -X POST "http://localhost:5000/api/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "System Update Notice",
    "body": "Maintenance window will start at 02:00 UTC.",
    "scheduled_at": "2026-10-30T10:00:00.000Z",
    "timezone": "UTC",
    "channels": [
      { "channel": "EMAIL", "recipient": "candidate@example.com" },
      { "channel": "PUSH", "recipient": "device-token-12345" }
    ]
  }'
```

### 3. Filter Notifications by Status
```bash
# Filter failed notifications:
curl "http://localhost:5000/api/notifications?status=FAILED&page=1&limit=10"

# Fetch all notifications:
curl "http://localhost:5000/api/notifications?status=ALL&page=1&limit=10"
```

### 4. Retry Failed Deliveries
```bash
# Retry all failed deliveries for a notification:
curl -X POST "http://localhost:5000/api/notifications/<NOTIFICATION_UUID>/retry"

# Retry a specific channel delivery:
curl -X POST "http://localhost:5000/api/notifications/<NOTIFICATION_UUID>/deliveries/<DELIVERY_UUID>/retry"
```

### 5. Wipe Database & Clear Queue (Reset)
```bash
curl -X DELETE "http://localhost:5000/api/notifications"
```

---

## 8. Frontend Architecture & Constraints

- **Strict `< 250 Lines` Limit**: Every single frontend component and page is strictly under 250 lines (averaging 50–150 lines):
  - `web/components/dashboard/`: `KpiCards.tsx`, `FilterToolbar.tsx`, `NotificationTable.tsx`, `Pagination.tsx`
  - `web/components/create/`: `SchedulePicker.tsx`, `ChannelSelector.tsx`
  - `web/components/details/`: `NotificationHeader.tsx`, `NotificationMeta.tsx`, `DeliveryCard.tsx`
- **Real-Time Polling**: The Notification Details view polls every 4 seconds when in `PENDING` or `PROCESSING` state so that live execution results appear automatically.
- **Hydration Safe**: Dynamic time evaluations (`Date.now()` and `Intl` timezones) mount client-side inside `useEffect` hooks, preventing Next.js 16 Partial Prerendering hydration errors.

---

## 9. Automated Testing

Run the automated test suite from `/api`:

```bash
cd api
pnpm run test
```

All **34 tests across 6 test suites pass with 100% success**:
- `notifications.dto.spec.ts` (14 tests): Zod validation, IANA timezone parsing, pagination coercion.
- `notifications.service.spec.ts` (7 tests): Creation, cancellation, retries, test email dispatch, database wipe.
- `notification-providers.spec.ts` (5 tests): Email, Push (Mock), and Telegram providers.
- `notification.processor.spec.ts` (5 tests): Worker host claiming, max retry backoff, zero-delay re-enqueues.
- `notification-recovery.service.spec.ts` (2 tests): Overdue candidate detection and recovery.
- `app.controller.spec.ts` (1 test): Base application controller health check.
