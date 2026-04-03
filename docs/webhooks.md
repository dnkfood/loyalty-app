# Webhook Events — Loyalty System

## Endpoint

```
POST /api/v1/webhooks/loyalty
```

## Authentication

All webhook requests must include an HMAC-SHA256 signature in the `X-Loyalty-Signature` header.

```
X-Loyalty-Signature: sha256=<hex-digest>
```

The signature is computed over the **raw request body** (before JSON parsing) using the shared `LOYALTY_WEBHOOK_SECRET`.

**Verification algorithm:**
```typescript
const expectedSig = crypto
  .createHmac('sha256', LOYALTY_WEBHOOK_SECRET)
  .update(rawBody)  // IMPORTANT: raw body, before JSON.parse
  .digest('hex');

if (!crypto.timingSafeEqual(
  Buffer.from(`sha256=${expectedSig}`),
  Buffer.from(receivedSignature)
)) {
  throw new UnauthorizedException('Invalid webhook signature');
}
```

> Always use `crypto.timingSafeEqual` — never use `===` for HMAC comparison (timing attack vulnerability).

---

## Payload Schema

```typescript
interface LoyaltyWebhookPayload {
  event_id: string;        // UUID v4, used for idempotency
  event_type: LoyaltyEventType;
  occurred_at: string;     // ISO 8601
  guest_id: string;        // Guest ID in the loyalty system
  data: Record<string, unknown>;
}
```

---

## Event Types

### `balance.updated`

Fired when the guest's point balance changes.

```json
{
  "event_id": "uuid-v4",
  "event_type": "balance.updated",
  "occurred_at": "2026-04-03T10:00:00.000Z",
  "guest_id": "guest-123",
  "data": {
    "old_balance": 1150,
    "new_balance": 1250,
    "reason": "points_earned"
  }
}
```

**BFF action:** Invalidates Redis cache for the guest.

---

### `transaction.created`

Fired when a new loyalty transaction is recorded.

```json
{
  "event_id": "uuid-v4",
  "event_type": "transaction.created",
  "occurred_at": "2026-04-03T10:00:00.000Z",
  "guest_id": "guest-123",
  "data": {
    "transaction_id": "txn-456",
    "type": "earn",
    "amount": 100,
    "description": "Покупка в ресторане",
    "new_balance": 1250
  }
}
```

**Transaction types:** `earn` | `spend` | `expire` | `correction`

**BFF action:**
1. Saves to `transaction_log` table (idempotent via `event_id`)
2. Invalidates Redis cache
3. Sends push notification to user

---

### `status.changed`

Fired when the guest's loyalty status level changes.

```json
{
  "event_id": "uuid-v4",
  "event_type": "status.changed",
  "occurred_at": "2026-04-03T10:00:00.000Z",
  "guest_id": "guest-123",
  "data": {
    "old_status": "silver",
    "new_status": "gold",
    "status_name": "Золотой",
    "next_level_points": 5000
  }
}
```

**BFF action:**
1. Updates `loyalty_cache` table
2. Invalidates Redis cache
3. Sends congratulation push notification

---

### `offer.assigned`

Fired when a personal offer is assigned to a guest.

```json
{
  "event_id": "uuid-v4",
  "event_type": "offer.assigned",
  "occurred_at": "2026-04-03T10:00:00.000Z",
  "guest_id": "guest-123",
  "data": {
    "offer_id": "offer-789",
    "offer_title": "Скидка 20% на пиццу",
    "expires_at": "2026-05-01T00:00:00.000Z"
  }
}
```

**BFF action:** Sends push notification about the new offer.

---

### `offer.used`

Fired when a guest uses a personal offer.

```json
{
  "event_id": "uuid-v4",
  "event_type": "offer.used",
  "occurred_at": "2026-04-03T10:00:00.000Z",
  "guest_id": "guest-123",
  "data": {
    "offer_id": "offer-789"
  }
}
```

---

### `offer.expired`

Fired when a personal offer expires without being used.

```json
{
  "event_id": "uuid-v4",
  "event_type": "offer.expired",
  "occurred_at": "2026-04-03T10:00:00.000Z",
  "guest_id": "guest-123",
  "data": {
    "offer_id": "offer-789"
  }
}
```

---

### `segment.changed`

Fired when the guest's loyalty segments are updated.

```json
{
  "event_id": "uuid-v4",
  "event_type": "segment.changed",
  "occurred_at": "2026-04-03T10:00:00.000Z",
  "guest_id": "guest-123",
  "data": {
    "segment_ids": ["seg-1", "seg-2", "seg-5"]
  }
}
```

**BFF action:** Updates `segmentIds` in `loyalty_cache`.

---

## Idempotency

Every webhook event has a unique `event_id` (UUID v4). The BFF checks this against the `transaction_log` table before processing:

```typescript
const existing = await prisma.transactionLog.findUnique({
  where: { eventId: payload.event_id },
});
if (existing) return; // already processed, skip
```

This ensures duplicate webhook deliveries are safely ignored.

---

## Retry Policy (BullMQ)

Events are processed asynchronously via BullMQ:

```typescript
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: 100,
  removeOnFail: 200,
}
```

- Attempt 1: immediate
- Attempt 2: 1 second delay
- Attempt 3: 2 seconds delay

---

## Response

The BFF responds synchronously with `200 OK` to acknowledge receipt:

```json
{
  "received": true
}
```

Actual processing happens asynchronously in the BullMQ worker.
