# REST API Reference

Base URL: `/api/v1`

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "meta": { "requestId": "uuid" }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "INVALID_OTP",
    "message": "Неверный код подтверждения",
    "details": {}
  },
  "meta": { "requestId": "uuid" }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `PHONE_INVALID` | Phone number format is invalid |
| `OTP_SENT` | OTP was sent (informational) |
| `OTP_INVALID` | OTP code is incorrect |
| `OTP_EXPIRED` | OTP code has expired |
| `OTP_MAX_ATTEMPTS` | Too many verification attempts |
| `TOKEN_INVALID` | JWT token is invalid |
| `TOKEN_EXPIRED` | JWT token has expired |
| `GUEST_NOT_FOUND` | User not linked to loyalty system |
| `LOYALTY_SYSTEM_UNAVAILABLE` | Loyalty system is unavailable |
| `NOT_FOUND` | Resource not found |
| `FORBIDDEN` | Access denied |
| `RATE_LIMITED` | Too many requests |
| `VALIDATION_ERROR` | Request validation failed |
| `INTERNAL_ERROR` | Internal server error |

---

## Authentication

### POST /auth/send-otp

Sends a 6-digit OTP to the specified phone number.

**Rate limit:** 3 requests / 10 min / IP

**Request:**
```json
{
  "phone": "79123456789"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": { "message": "OTP sent successfully" },
  "meta": { "requestId": "uuid" }
}
```

---

### POST /auth/verify-otp

Verifies OTP and issues JWT tokens.

**Rate limit:** 5 attempts / 10 min / phone

**Request:**
```json
{
  "phone": "79123456789",
  "code": "123456",
  "deviceId": "optional-device-id"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "uuid",
      "phone": "79123456789",
      "name": null
    }
  }
}
```

---

### POST /auth/refresh

Refreshes the access token using a valid refresh token. Implements token rotation.

**Auth:** Refresh token in request body

**Request:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

### POST /auth/logout

Invalidates the current session.

**Auth:** Bearer JWT

**Response:** 204 No Content

---

## Profile

### GET /profile

**Auth:** Bearer JWT

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phone": "79123456789",
    "name": "Иван Иванов",
    "email": "user@example.com",
    "birthDate": "1990-01-15T00:00:00.000Z",
    "consentGiven": true,
    "consentGivenAt": "2026-01-01T00:00:00.000Z",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

### PATCH /profile

**Auth:** Bearer JWT

**Request:**
```json
{
  "name": "Иван Иванов",
  "email": "user@example.com",
  "birthDate": "1990-01-15"
}
```

---

### POST /profile/consent

Records personal data processing consent.

**Auth:** Bearer JWT

**Request:**
```json
{
  "consentVersion": "v1.2"
}
```

---

## Loyalty

### GET /loyalty/balance

**Auth:** Bearer JWT

**Response 200:**
```json
{
  "success": true,
  "data": {
    "balance": 1250,
    "statusLevel": "gold",
    "statusName": "Золотой",
    "nextLevelPoints": 750,
    "isCached": false
  }
}
```

> Note: `isCached: true` means data is served from cache due to loyalty system unavailability.

---

### GET /loyalty/transactions

**Auth:** Bearer JWT

**Query params:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "earn",
        "amount": 100,
        "newBalance": 1250,
        "description": "Покупка в ресторане",
        "occurredAt": "2026-04-03T10:00:00.000Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 20
  }
}
```

**Transaction types:** `earn` | `spend` | `expire` | `correction`

---

### GET /loyalty/card

**Auth:** Bearer JWT

**Response 200:**
```json
{
  "success": true,
  "data": {
    "qrData": "{\"type\":\"loyalty_card\",\"guestId\":\"...\",\"ts\":1712145600000}",
    "externalGuestId": "guest-123"
  }
}
```

---

## Offers

### GET /offers

Returns personalized offers from the loyalty system.

**Auth:** Bearer JWT

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "offer-123",
      "title": "Скидка 20% на пиццу",
      "description": "Только для золотых участников",
      "imageUrl": "https://cdn.example.com/offer.jpg",
      "expiresAt": "2026-05-01T00:00:00.000Z",
      "discount": 20
    }
  ]
}
```

---

## Promotions

### GET /promotions

Returns general promotions available to all users.

**Auth:** Bearer JWT

---

## Webhooks

### POST /webhooks/loyalty

Receives events from the loyalty system. See [webhooks.md](./webhooks.md).

**Auth:** HMAC signature (`X-Loyalty-Signature: sha256=<hex>`)

---

## Admin

All admin endpoints require Staff JWT authentication.

### GET /admin/users

**Roles:** SUPER_ADMIN, ADMIN, SUPPORT, ANALYST

**Query params:** `page`, `limit`, `search`

---

### GET /admin/users/:id

**Roles:** SUPER_ADMIN, ADMIN, SUPPORT

---

### POST /admin/campaigns

**Roles:** SUPER_ADMIN, ADMIN, MARKETER

**Request:**
```json
{
  "title": "Весенняя акция",
  "body": "Успейте воспользоваться нашим предложением!",
  "segmentIds": ["segment-1", "segment-2"],
  "scheduledAt": "2026-04-10T10:00:00.000Z"
}
```

---

### POST /admin/campaigns/:id/launch

**Roles:** SUPER_ADMIN, ADMIN, MARKETER

Launches a draft campaign immediately.

---

### POST /admin/staff

**Roles:** SUPER_ADMIN only

**Request:**
```json
{
  "email": "marketer@company.com",
  "name": "Анна Маркетолог",
  "role": "MARKETER",
  "password": "strong-password"
}
```

**Staff roles:** `SUPER_ADMIN` | `ADMIN` | `MARKETER` | `SUPPORT` | `ANALYST` | `CONTENT_MANAGER`

---

### PATCH /admin/staff/:id

**Roles:** SUPER_ADMIN only

**Request:**
```json
{
  "role": "ADMIN",
  "isActive": true
}
```
