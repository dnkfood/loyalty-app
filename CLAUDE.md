# CLAUDE.md — Loyalty App (Restaurant Chain)

> Этот файл — главная инструкция для Claude Code.
> Читай его целиком перед любой задачей. Не пропускай разделы.

---

## 0. Структура монорепо

```
loyalty-app/
├── CLAUDE.md                  ← этот файл
├── package.json               ← workspaces root
├── turbo.json                 ← Turborepo pipeline
├── .env.example
│
├── apps/
│   ├── mobile/                ← React Native (Expo)
│   ├── bff/                   ← NestJS Backend for Frontend
│   └── admin/                 ← React (Vite) + Ant Design Pro
│
├── packages/
│   ├── shared-types/          ← TypeScript типы, общие для всех apps
│   ├── shared-utils/          ← Утилиты: маскировка PII, валидация телефона
│   └── eslint-config/         ← Общий ESLint конфиг
│
├── infrastructure/
│   ├── docker-compose.yml     ← PostgreSQL, Redis для локальной разработки
│   ├── docker-compose.test.yml
│   └── k8s/                   ← Kubernetes манифесты (Deployment, Service, Ingress)
│
└── docs/
    ├── api.md                 ← Описание REST API
    ├── webhooks.md            ← Схема webhook-событий
    └── adr/                   ← Architecture Decision Records
```

---

## 1. Технологический стек

### Mobile (`apps/mobile`)
- **React Native** с **Expo SDK 51+**
- **TypeScript** строгий режим (`"strict": true`)
- **Expo Router** (file-based routing)
- **Zustand** — стейт-менеджер
- **React Query (TanStack Query v5)** — серверный стейт, кэш, retry
- **expo-secure-store** — хранение JWT refresh token (Keychain / EncryptedSharedPreferences)
- **expo-local-authentication** — биометрия (Face ID / Touch ID)
- **react-native-qrcode-svg** — генерация QR-карты
- **Zod** — валидация данных на клиенте

### BFF (`apps/bff`)
- **NestJS** + **TypeScript** строгий режим
- **Prisma ORM** — работа с PostgreSQL
- **PostgreSQL 16** — основная БД
- **Redis 7** — кэш, сессии, rate limiting, BullMQ
- **BullMQ** — очереди (SMS, Push, Webhook-обработка)
- **Passport.js** — стратегии авторизации (JWT)
- **class-validator + class-transformer** — валидация DTO
- **Zod** — дополнительная валидация webhook payload
- **ioredis** — Redis клиент
- **@nestjs/swagger** — автогенерация OpenAPI документации
- **Jest** — unit и integration тесты

### Admin (`apps/admin`)
- **React 18** + **Vite**
- **TypeScript** строгий режим
- **Ant Design Pro** (ProTable, ProForm, ProLayout)
- **React Query** — серверный стейт
- **Zustand** — локальный стейт (auth, sidebar)
- **React Router v6**
- **Axios** — HTTP клиент

### Shared Types (`packages/shared-types`)
- Чистый TypeScript, без зависимостей
- Экспортирует: типы сущностей, типы API-запросов/ответов, типы webhook-событий, enum-ы

---

## 2. Команды

### Установка зависимостей
```bash
pnpm install          # установить все зависимости воркспейса
```

### Локальная разработка
```bash
# Запустить инфраструктуру (PostgreSQL + Redis)
docker-compose -f infrastructure/docker-compose.yml up -d

# Миграции БД
pnpm --filter bff exec prisma migrate dev

# Запустить все сервисы параллельно
pnpm dev

# Запустить конкретный сервис
pnpm --filter bff dev
pnpm --filter mobile start
pnpm --filter admin dev
```

### Сборка
```bash
pnpm build                    # сборка всех пакетов через Turborepo
pnpm --filter bff build
pnpm --filter admin build
```

### Тесты
```bash
pnpm test                     # запуск всех тестов
pnpm --filter bff test
pnpm --filter bff test:e2e
pnpm --filter mobile test
pnpm test:coverage            # с покрытием
```

### Линтинг и форматирование
```bash
pnpm lint                     # ESLint по всем пакетам
pnpm lint:fix                 # ESLint с автофиксом
pnpm format                   # Prettier
pnpm typecheck                # tsc --noEmit по всем пакетам
```

### Prisma
```bash
pnpm --filter bff exec prisma migrate dev --name <migration_name>
pnpm --filter bff exec prisma migrate deploy   # production
pnpm --filter bff exec prisma studio           # GUI для БД
pnpm --filter bff exec prisma generate         # регенерировать клиент
```

### Docker
```bash
docker-compose -f infrastructure/docker-compose.yml up -d
docker-compose -f infrastructure/docker-compose.yml down
docker-compose -f infrastructure/docker-compose.yml logs -f
```

---

## 3. Переменные окружения

### BFF (`apps/bff/.env`)
```env
# Database
DATABASE_URL="postgresql://loyalty:password@localhost:5432/loyalty_db"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_ACCESS_SECRET="change-me-min-32-chars"
JWT_REFRESH_SECRET="change-me-min-32-chars-refresh"
JWT_ACCESS_TTL="900"       # 15 минут в секундах
JWT_REFRESH_TTL="2592000"  # 30 дней в секундах

# SMS providers
SMS_PRIMARY_PROVIDER="beeline"        # beeline | alfa
BEELINE_SMS_API_URL="https://api.beeline.ru/sms/v1"
BEELINE_SMS_API_KEY=""
ALFA_SMS_API_URL="https://www.alfasms.ru/api"
ALFA_SMS_API_KEY=""
ALFA_SMS_LOGIN=""
ALFA_SMS_PASSWORD=""

# Push
FCM_SERVER_KEY=""
APNS_KEY_ID=""
APNS_TEAM_ID=""
APNS_BUNDLE_ID="com.company.loyaltyapp"
APNS_KEY_PATH="./certs/apns.p8"

# Loyalty system integration
LOYALTY_SYSTEM_API_URL="https://loyalty.internal/api/v1"
LOYALTY_SYSTEM_API_KEY=""
LOYALTY_WEBHOOK_SECRET="hmac-secret-min-32-chars"

# App
NODE_ENV="development"
PORT="3000"
API_PREFIX="api/v1"
CORS_ORIGINS="http://localhost:5173,https://admin.yourdomain.com"

# Rate limiting
RATE_LIMIT_OTP_SEND_MAX="3"
RATE_LIMIT_OTP_SEND_WINDOW="600"    # 10 минут
RATE_LIMIT_OTP_VERIFY_MAX="5"
RATE_LIMIT_OTP_VERIFY_WINDOW="600"

# Push frequency cap
PUSH_MAX_PER_USER_PER_DAY="3"
```

### Mobile (`apps/mobile/.env`)
```env
EXPO_PUBLIC_BFF_URL="http://localhost:3000/api/v1"
EXPO_PUBLIC_APP_ENV="development"
```

### Admin (`apps/admin/.env`)
```env
VITE_BFF_URL="http://localhost:3000/api/v1"
```

> ⚠️ Никогда не коммить `.env` файлы. Только `.env.example` без реальных значений.

---

## 4. Архитектура BFF

### Структура модулей NestJS

```
apps/bff/src/
├── main.ts
├── app.module.ts
│
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── jwt-refresh.strategy.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   └── dto/
│   │       ├── send-otp.dto.ts
│   │       └── verify-otp.dto.ts
│   │
│   ├── loyalty/
│   │   ├── loyalty.module.ts
│   │   ├── loyalty.controller.ts
│   │   ├── loyalty.service.ts
│   │   └── loyalty.cache.service.ts
│   │
│   ├── profile/
│   ├── offers/
│   ├── promotions/
│   ├── notifications/
│   │   ├── push/
│   │   │   ├── push.service.ts
│   │   │   ├── push.queue.ts
│   │   │   └── templates/
│   │   └── sms/
│   │       ├── sms.service.ts
│   │       ├── providers/
│   │       │   ├── sms-gateway.interface.ts
│   │       │   ├── beeline-sms.gateway.ts
│   │       │   └── alfa-sms.gateway.ts
│   │       └── sms.queue.ts
│   │
│   ├── webhooks/
│   │   ├── webhooks.module.ts
│   │   ├── webhooks.controller.ts
│   │   ├── webhooks.service.ts
│   │   └── handlers/
│   │       ├── balance-updated.handler.ts
│   │       ├── transaction-created.handler.ts
│   │       └── status-changed.handler.ts
│   │
│   └── admin/
│       ├── admin.module.ts
│       ├── users/
│       ├── campaigns/
│       ├── staff/
│       └── audit/
│
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── guards/
│   ├── pipes/
│   │   └── phone-validation.pipe.ts
│   └── utils/
│       ├── mask-phone.ts      # 79123456789 → 791***6789
│       └── hmac.ts
│
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── jwt.config.ts
│
└── prisma/
    ├── schema.prisma
    └── migrations/
```

### Принципы модулей NestJS
- Каждый модуль — самодостаточная единица с own Controller, Service, Module
- Бизнес-логика только в Service, Controller только маршрутизирует
- Все зависимости через DI (не `new SomeService()`)
- Использовать `@Injectable({ scope: Scope.DEFAULT })` — singleton по умолчанию

---

## 5. Схема базы данных (Prisma)

```prisma
// apps/bff/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id               String    @id @default(uuid())
  phone            String    @unique
  externalGuestId  String?   @unique @map("external_guest_id")
  name             String?
  email            String?
  birthDate        DateTime? @map("birth_date")
  avatarUrl        String?   @map("avatar_url")
  consentGiven     Boolean   @default(false) @map("consent_given")
  consentGivenAt   DateTime? @map("consent_given_at")
  consentVersion   String?   @map("consent_version")
  isActive         Boolean   @default(true) @map("is_active")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  sessions         AuthSession[]
  pushTokens       PushToken[]

  @@map("users")
}

model AuthSession {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  refreshToken String   @map("refresh_token") // bcrypt хэш
  deviceId     String?  @map("device_id")
  deviceInfo   Json?    @map("device_info")
  ipAddress    String?  @map("ip_address")
  expiresAt    DateTime @map("expires_at")
  createdAt    DateTime @default(now()) @map("created_at")

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("auth_sessions")
}

model OtpCode {
  id          String    @id @default(uuid())
  phone       String
  codeHash    String    @map("code_hash") // bcrypt хэш OTP
  attempts    Int       @default(0)
  expiresAt   DateTime  @map("expires_at")
  usedAt      DateTime? @map("used_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([phone])
  @@map("otp_codes")
}

model LoyaltyCache {
  userId          String   @id @map("user_id")
  externalGuestId String   @map("external_guest_id")
  balance         Int      @default(0)
  statusLevel     String   @map("status_level")
  statusName      String   @map("status_name")
  nextLevelPoints Int?     @map("next_level_points")
  segmentIds      String[] @map("segment_ids")
  isCached        Boolean  @default(true) @map("is_cached")
  cachedAt        DateTime @map("cached_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("loyalty_cache")
}

model TransactionLog {
  id              String   @id @default(uuid())
  eventId         String   @unique @map("event_id") // идемпотентность
  externalGuestId String   @map("external_guest_id")
  transactionId   String   @map("transaction_id")
  type            String   // earn | spend | expire | correction
  amount          Int
  newBalance      Int      @map("new_balance")
  description     String?
  occurredAt      DateTime @map("occurred_at")
  processedAt     DateTime @default(now()) @map("processed_at")

  @@index([externalGuestId])
  @@map("transaction_log")
}

model PushToken {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  token     String   @unique
  platform  String   // ios | android
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("push_tokens")
}

model Campaign {
  id          String    @id @default(uuid())
  title       String
  templateId  String?   @map("template_id")
  body        String
  data        Json?     // deep link и доп. параметры
  segmentIds  String[]  @map("segment_ids")
  status      String    @default("draft") // draft | scheduled | running | done | failed
  scheduledAt DateTime? @map("scheduled_at")
  startedAt   DateTime? @map("started_at")
  completedAt DateTime? @map("completed_at")
  sentCount   Int       @default(0) @map("sent_count")
  createdById String    @map("created_by_id")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@map("campaigns")
}

model PushNotificationLog {
  id           String    @id @default(uuid())
  campaignId   String?   @map("campaign_id")
  userId       String    @map("user_id")
  token        String
  status       String    // sent | delivered | failed | opened | converted
  errorCode    String?   @map("error_code")
  sentAt       DateTime  @default(now()) @map("sent_at")
  deliveredAt  DateTime? @map("delivered_at")
  openedAt     DateTime? @map("opened_at")

  @@index([campaignId])
  @@index([userId])
  @@map("push_notification_log")
}

model StaffUser {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String    @map("password_hash")
  name         String
  role         StaffRole
  totpSecret   String?   @map("totp_secret")
  totpEnabled  Boolean   @default(false) @map("totp_enabled")
  isActive     Boolean   @default(true) @map("is_active")
  lastLoginAt  DateTime? @map("last_login_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  auditLogs    AuditLog[]

  @@map("staff_users")
}

enum StaffRole {
  SUPER_ADMIN
  ADMIN
  MARKETER
  SUPPORT
  ANALYST
  CONTENT_MANAGER
}

model AuditLog {
  id           String    @id @default(uuid())
  staffUserId  String    @map("staff_user_id")
  action       String    // LOGIN | CREATE_CAMPAIGN | VIEW_USER | SEND_PUSH | etc.
  targetEntity String?   @map("target_entity") // User | Campaign | etc.
  targetId     String?   @map("target_id")
  details      Json?
  ipAddress    String?   @map("ip_address")
  userAgent    String?   @map("user_agent")
  createdAt    DateTime  @default(now()) @map("created_at")

  staffUser    StaffUser @relation(fields: [staffUserId], references: [id])

  @@index([staffUserId])
  @@index([createdAt])
  @@map("audit_log")
}
```

---

## 6. REST API — контракт

### Базовый URL
```
/api/v1
```

### Формат ответа
```typescript
// Успех
{
  "success": true,
  "data": { ... },
  "meta": { "requestId": "uuid" }  // опционально
}

// Ошибка
{
  "success": false,
  "error": {
    "code": "INVALID_OTP",
    "message": "Неверный код подтверждения",
    "details": {}  // опционально
  },
  "meta": { "requestId": "uuid" }
}
```

### Коды ошибок (константы)
```typescript
export const ErrorCodes = {
  // Auth
  PHONE_INVALID: 'PHONE_INVALID',
  OTP_SENT: 'OTP_SENT',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  // Loyalty
  GUEST_NOT_FOUND: 'GUEST_NOT_FOUND',
  LOYALTY_SYSTEM_UNAVAILABLE: 'LOYALTY_SYSTEM_UNAVAILABLE',
  // General
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
```

### Эндпоинты

| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| POST | /auth/send-otp | Нет | Отправка OTP |
| POST | /auth/verify-otp | Нет | Верификация OTP + JWT |
| POST | /auth/refresh | RefreshToken | Обновление access token |
| POST | /auth/logout | JWT | Выход |
| GET | /profile | JWT | Получить профиль |
| PATCH | /profile | JWT | Обновить профиль |
| POST | /profile/consent | JWT | Записать согласие на ПДн |
| GET | /loyalty/balance | JWT | Баланс + статус |
| GET | /loyalty/transactions | JWT | История (page, limit) |
| GET | /loyalty/card | JWT | QR-данные карты |
| GET | /offers | JWT | Персональные предложения |
| GET | /promotions | JWT | Общие акции |
| GET | /notifications | JWT | In-app inbox |
| PATCH | /notifications/:id/read | JWT | Отметить как прочитанное |
| POST | /devices/push-token | JWT | Регистрация push-токена |
| DELETE | /devices/push-token | JWT | Удаление push-токена |
| POST | /webhooks/loyalty | HMAC | Входящие события |
| GET | /admin/users | Staff JWT | Список пользователей |
| GET | /admin/users/:id | Staff JWT | Профиль пользователя |
| GET | /admin/users/:id/balance | Staff JWT | Баланс пользователя |
| GET | /admin/users/:id/transactions | Staff JWT | Транзакции пользователя |
| POST | /admin/campaigns | Staff JWT | Создать push-кампанию |
| GET | /admin/campaigns | Staff JWT | Список кампаний |
| POST | /admin/campaigns/:id/launch | Staff JWT | Запустить кампанию |
| GET | /admin/sms-logs | Staff JWT | Статусы SMS |
| GET | /admin/audit-log | Staff JWT | Журнал действий |
| GET | /admin/dashboard | Staff JWT | Метрики дашборда |
| POST | /admin/staff | Super Admin | Создать сотрудника |
| PATCH | /admin/staff/:id | Super Admin | Обновить роль/статус |

---

## 7. Webhook — входящие события от системы лояльности

### URL
```
POST /api/v1/webhooks/loyalty
```

### Верификация
```typescript
// Заголовок: X-Loyalty-Signature: sha256=<hex>
// Алгоритм верификации:
const expectedSig = crypto
  .createHmac('sha256', LOYALTY_WEBHOOK_SECRET)
  .update(rawBody)  // ВАЖНО: rawBody, до JSON.parse
  .digest('hex');

if (!crypto.timingSafeEqual(
  Buffer.from(`sha256=${expectedSig}`),
  Buffer.from(receivedSignature)
)) {
  throw new UnauthorizedException('Invalid webhook signature');
}
```

### Типы событий
```typescript
type LoyaltyEventType =
  | 'balance.updated'
  | 'transaction.created'
  | 'status.changed'
  | 'offer.assigned'
  | 'offer.used'
  | 'offer.expired'
  | 'segment.changed';

interface LoyaltyWebhookPayload {
  event_id: string;        // UUID v4, для идемпотентности
  event_type: LoyaltyEventType;
  occurred_at: string;     // ISO 8601
  guest_id: string;        // ID гостя в системе лояльности
  data: Record<string, unknown>;
}

// Пример для transaction.created:
interface TransactionCreatedData {
  transaction_id: string;
  type: 'earn' | 'spend' | 'expire' | 'correction';
  amount: number;
  description: string;
  new_balance: number;
}
```

### Обработка (идемпотентность)
```typescript
// В WebhooksService:
async processEvent(payload: LoyaltyWebhookPayload): Promise<void> {
  // 1. Проверить event_id в transaction_log
  const existing = await this.prisma.transactionLog.findUnique({
    where: { eventId: payload.event_id },
  });
  if (existing) return; // уже обработано

  // 2. Поставить в очередь BullMQ
  await this.webhookQueue.add(payload.event_type, payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  });
}
```

---

## 8. SMS-провайдеры

### Интерфейс
```typescript
// packages/shared-types/src/sms.ts
export interface SmsGateway {
  sendOtp(phone: string, code: string): Promise<SmsResult>;
  getDeliveryStatus(messageId: string): Promise<SmsDeliveryStatus>;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type SmsDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'unknown';
```

### Реализация с failover
```typescript
// apps/bff/src/modules/notifications/sms/sms.service.ts
@Injectable()
export class SmsService {
  constructor(
    @Inject('BEELINE_SMS') private beeline: SmsGateway,
    @Inject('ALFA_SMS') private alfa: SmsGateway,
    private config: ConfigService,
  ) {}

  async sendOtp(phone: string, code: string): Promise<SmsResult> {
    const primary = this.config.get('SMS_PRIMARY_PROVIDER') === 'beeline'
      ? this.beeline : this.alfa;
    const fallback = this.config.get('SMS_PRIMARY_PROVIDER') === 'beeline'
      ? this.alfa : this.beeline;

    try {
      const result = await Promise.race([
        primary.sendOtp(phone, code),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SMS timeout')), 5000)
        ),
      ]);
      if (result.success) return result;
      throw new Error('Primary SMS failed');
    } catch (err) {
      // Логировать ошибку primary, попробовать fallback
      this.logger.warn(`Primary SMS failed: ${err.message}, trying fallback`);
      return fallback.sendOtp(phone, code);
    }
  }
}
```

---

## 9. Push-уведомления

### Шаблоны
```typescript
// apps/bff/src/modules/notifications/push/templates/index.ts
export const PushTemplates = {
  TRANSACTION_EARN: {
    title: 'Баллы начислены',
    body: 'Вам начислено {{amount}} баллов. Баланс: {{new_balance}}',
  },
  TRANSACTION_SPEND: {
    title: 'Баллы списаны',
    body: 'Списано {{amount}} баллов. Остаток: {{new_balance}}',
  },
  STATUS_UPGRADED: {
    title: 'Новый статус!',
    body: 'Поздравляем! Вы достигли уровня {{status_name}}',
  },
  OFFER_ASSIGNED: {
    title: 'Персональное предложение',
    body: '{{offer_title}} — только для вас до {{expires_at}}',
  },
  BIRTHDAY: {
    title: 'С днём рождения!',
    body: '{{name}}, мы дарим вам {{gift_description}}',
  },
} as const;

// Интерполяция переменных
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}
```

### Deep links
```
loyalty-app://home
loyalty-app://balance
loyalty-app://transactions
loyalty-app://offers
loyalty-app://offers/:offerId
loyalty-app://promotions/:promotionId
loyalty-app://notifications
loyalty-app://profile
```

### Frequency capping
```typescript
// Ключ в Redis: push:freq:{userId}:{date}
// Значение: счётчик отправленных push за день
async canSendPush(userId: string): Promise<boolean> {
  const key = `push:freq:${userId}:${new Date().toISOString().split('T')[0]}`;
  const count = await this.redis.get(key);
  const max = this.config.get<number>('PUSH_MAX_PER_USER_PER_DAY', 3);
  return !count || parseInt(count) < max;
}

async incrementPushCount(userId: string): Promise<void> {
  const key = `push:freq:${userId}:${new Date().toISOString().split('T')[0]}`;
  const pipeline = this.redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, 86400); // TTL 24 часа
  await pipeline.exec();
}
```

---

## 10. Безопасность — обязательные требования

### JWT
- Access token TTL: 15 минут (`JWT_ACCESS_TTL=900`)
- Refresh token TTL: 30 дней (`JWT_REFRESH_TTL=2592000`)
- Refresh token хранится в БД как bcrypt-хэш (cost 10)
- При обновлении — rotation: старый инвалидируется, новый выдаётся
- При logout — refresh token удаляется из БД и устройства

### Rate Limiting (Redis + Throttler)
```typescript
// OTP send: 3 запроса / 10 мин / IP
// OTP verify: 5 попыток / 10 мин / phone
// General API: 100 запросов / мин / user
// Admin API: 60 запросов / мин / staff_user
```

### Маскировка телефона в логах
```typescript
// packages/shared-utils/src/mask-phone.ts
export function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return `${phone.slice(0, 3)}***${phone.slice(-3)}`;
}
// 79123456789 → 791***789
```

### HMAC верификация webhook
- Всегда использовать `crypto.timingSafeEqual` для сравнения
- Использовать raw body (до парсинга JSON): настроить `rawBodyMiddleware` в NestJS
- Логировать неуспешные верификации с IP

### Certificate pinning (Mobile)
```typescript
// apps/mobile/src/lib/api/client.ts
// Настроить через expo-build-properties + network_security_config (Android)
// и через Info.plist NSExceptionDomains (iOS)
// Пример для development — отключить, для production — включить
```

### Хранение токенов (Mobile)
```typescript
import * as SecureStore from 'expo-secure-store';

// Сохранить
await SecureStore.setItemAsync('refresh_token', token, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
});

// Получить
const token = await SecureStore.getItemAsync('refresh_token');

// Удалить (logout)
await SecureStore.deleteItemAsync('refresh_token');
```

---

## 11. Кэширование данных лояльности

### Стратегия
```typescript
// apps/bff/src/modules/loyalty/loyalty.cache.service.ts

const CACHE_TTL = 300; // 5 минут
const CACHE_KEY = (guestId: string) => `loyalty:${guestId}`;

// Получить (cache-first)
async getBalance(guestId: string): Promise<LoyaltyCacheDto> {
  const cached = await this.redis.get(CACHE_KEY(guestId));
  if (cached) {
    return { ...JSON.parse(cached), isCached: true };
  }

  // Cache miss — запрос к системе лояльности
  try {
    const data = await this.loyaltySystemClient.getGuestData(guestId);
    await this.redis.setex(CACHE_KEY(guestId), CACHE_TTL, JSON.stringify(data));
    return { ...data, isCached: false };
  } catch (err) {
    // Fallback: вернуть из PostgreSQL loyalty_cache
    const dbCache = await this.prisma.loyaltyCache.findUnique({
      where: { userId: guestId },
    });
    if (dbCache) return { ...dbCache, isCached: true };
    throw new ServiceUnavailableException('Loyalty system unavailable');
  }
}

// Инвалидировать (при получении webhook)
async invalidateCache(guestId: string): Promise<void> {
  await this.redis.del(CACHE_KEY(guestId));
}
```

---

## 12. Структура мобильного приложения

```
apps/mobile/
├── app/                        ← Expo Router (file-based routing)
│   ├── (auth)/
│   │   ├── index.tsx           ← /: экран ввода телефона
│   │   └── verify.tsx          ← /verify: экран ввода OTP
│   ├── (app)/
│   │   ├── _layout.tsx         ← Tab navigator
│   │   ├── index.tsx           ← /app: главный экран (баланс)
│   │   ├── transactions.tsx    ← история операций
│   │   ├── card.tsx            ← QR-карта
│   │   ├── offers.tsx          ← персональные предложения
│   │   └── profile.tsx         ← профиль
│   └── _layout.tsx             ← Root layout, auth guard
│
├── src/
│   ├── api/
│   │   ├── client.ts           ← Axios instance, interceptors
│   │   ├── auth.api.ts
│   │   ├── loyalty.api.ts
│   │   └── profile.api.ts
│   │
│   ├── stores/
│   │   ├── auth.store.ts       ← Zustand: user, tokens
│   │   └── ui.store.ts         ← Zustand: loading, errors
│   │
│   ├── hooks/
│   │   ├── useBalance.ts       ← React Query: баланс
│   │   ├── useTransactions.ts
│   │   └── useBiometric.ts
│   │
│   ├── components/
│   │   ├── ui/                 ← Базовые компоненты (Button, Card, Badge)
│   │   ├── loyalty/
│   │   │   ├── BalanceCard.tsx
│   │   │   ├── LoyaltyQRCard.tsx
│   │   │   └── TransactionItem.tsx
│   │   └── notifications/
│   │
│   └── utils/
│       ├── token.ts            ← работа с SecureStore
│       └── format.ts           ← форматирование дат, чисел
│
└── assets/
```

### Axios interceptors (Mobile)
```typescript
// src/api/client.ts
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        const { data } = await axios.post('/auth/refresh', { refreshToken });

        await SecureStore.setItemAsync('refresh_token', data.data.refreshToken);
        apiClient.defaults.headers['Authorization'] = `Bearer ${data.data.accessToken}`;

        failedQueue.forEach((p) => p.resolve(data.data.accessToken));
        failedQueue = [];
        return apiClient(originalRequest);
      } catch (refreshError) {
        failedQueue.forEach((p) => p.reject(refreshError));
        failedQueue = [];
        // Разлогинить пользователя
        useAuthStore.getState().logout();
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 13. Логирование и мониторинг

### Winston (BFF)
```typescript
// Все логи — структурированный JSON
{
  "timestamp": "2026-04-03T10:00:00.000Z",
  "level": "info",
  "message": "OTP sent",
  "requestId": "uuid",
  "phone": "791***789",       // МАСКИРОВАННЫЙ
  "provider": "beeline",
  "messageId": "msg_123"
}

// НИКОГДА не логировать:
// - полный номер телефона
// - OTP коды
// - JWT токены
// - API ключи
// - пароли
```

### Request ID
```typescript
// Каждый запрос получает X-Request-ID (UUID v4)
// Передаётся через весь stack: BFF → внешние сервисы → логи
// Возвращается в заголовке ответа и в meta.requestId
```

### Sentry
```typescript
// apps/bff/src/main.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% трассировок
  beforeSend(event) {
    // Очистить PII из событий
    if (event.request?.data?.phone) {
      event.request.data.phone = maskPhone(event.request.data.phone);
    }
    return event;
  },
});
```

---

## 14. Тестирование

### BFF — что покрывать тестами
- **Unit**: каждый Service, обработчики очередей, утилиты
- **Integration**: каждый Controller (с моком Prisma и Redis)
- **E2E**: критичные flow: авторизация, получение баланса, обработка webhook

### Именование тестов
```typescript
describe('AuthService', () => {
  describe('sendOtp', () => {
    it('should generate OTP, save hash to DB and call SMS provider', async () => {});
    it('should throw if phone format is invalid', async () => {});
    it('should throw RATE_LIMITED if limit exceeded', async () => {});
  });
});
```

### Моки внешних сервисов
```typescript
// Всегда мокировать: SMS провайдеры, FCM, Loyalty System API
// Использовать jest.mock() или NestJS custom providers
const mockSmsGateway: jest.Mocked<SmsGateway> = {
  sendOtp: jest.fn().mockResolvedValue({ success: true, messageId: 'mock_id' }),
  getDeliveryStatus: jest.fn().mockResolvedValue('delivered'),
};
```

### Mobile — что покрывать тестами
- **Unit**: store-ы (Zustand), утилиты, хуки
- **Component**: BalanceCard, LoyaltyQRCard (с React Native Testing Library)

---

## 15. Правила разработки

### Что всегда делать
- Использовать TypeScript строгий режим (`"strict": true`)
- Писать типы для всего — `any` запрещён (eslint: `@typescript-eslint/no-explicit-any: error`)
- Использовать `async/await`, не `.then().catch()` цепочки
- Обрабатывать все ошибки явно — не глотать исключения
- Покрывать новые функции тестами сразу
- Добавлять JSDoc для публичных методов Service-классов
- Использовать именованные экспорты, не дефолтные (кроме React компонентов)
- Следовать именованию из существующей кодовой базы

### Что никогда не делать
- Не коммитить `.env` файлы с реальными секретами
- Не логировать PII в открытом виде (телефон, email, токены)
- Не использовать `console.log` в production коде (только `Logger` из NestJS или Winston)
- Не делать прямые запросы из Mobile к системе лояльности — только через BFF
- Не хранить API-ключи в коде мобильного приложения
- Не пропускать валидацию входящих данных (DTO + class-validator на BFF)
- Не использовать `bcrypt.compareSync` — только `bcrypt.compare` (async)
- Не сравнивать HMAC через `===` — только `crypto.timingSafeEqual`

### Git конвенции
```
feat(auth): add OTP rate limiting per phone number
fix(loyalty): handle cache miss when loyalty system is down
chore(deps): update expo-sdk to 51.0.28
refactor(bff): extract SMS failover logic to SmsService
test(webhooks): add idempotency test for duplicate events
docs(api): document push notification endpoints
```

### Структура PR
- Один PR = одна функциональная единица
- Обязателен `pnpm test` и `pnpm typecheck` перед созданием PR
- Описание PR: что сделано, как тестировать, скриншоты (для UI изменений)

---

## 16. Локальная разработка — быстрый старт

```bash
# 1. Клонировать репо
git clone https://github.com/your-org/loyalty-app.git
cd loyalty-app

# 2. Установить зависимости
pnpm install

# 3. Поднять инфраструктуру
docker-compose -f infrastructure/docker-compose.yml up -d

# 4. Настроить переменные окружения
cp apps/bff/.env.example apps/bff/.env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/admin/.env.example apps/admin/.env
# Заполнить реальными значениями

# 5. Применить миграции
pnpm --filter bff exec prisma migrate dev

# 6. Засеять тестовые данные
pnpm --filter bff exec prisma db seed

# 7. Запустить всё
pnpm dev
```

### Доступные сервисы после запуска
| Сервис | URL |
|--------|-----|
| BFF API | http://localhost:3000/api/v1 |
| Swagger | http://localhost:3000/api/docs |
| Admin Panel | http://localhost:5173 |
| Prisma Studio | http://localhost:5555 |
| Redis | localhost:6379 |
| PostgreSQL | localhost:5432 |

---

## 17. Deployment

### Docker images
```
loyalty-bff:latest
loyalty-admin:latest
```

### Kubernetes
- BFF: `Deployment` с `replicas: 2` (минимум), HPA по CPU
- PostgreSQL: Managed (Yandex Managed PostgreSQL или аналог)
- Redis: Managed (Yandex Managed Redis или аналог)
- Secrets: Kubernetes Secrets (не ConfigMap)
- Ingress: nginx-ingress с TLS termination

### CI/CD (GitHub Actions)
- `push` в `main` → тесты → build → deploy to staging
- `tag v*.*.*` → тесты → build → deploy to production
- Mobile: Fastlane для TestFlight (iOS) и Google Play Internal (Android)
- OTA: Expo EAS Update для hotfix (без публикации в Store)

---

## 18. Часто задаваемые вопросы

**Q: Где хранить push-токены при смене устройства?**
A: При каждом запуске приложения вызывать `POST /devices/push-token`. BFF обновляет или создаёт запись. Старые невалидные токены помечать `isActive: false` при получении ошибки от FCM/APNs.

**Q: Что делать, если система лояльности не отвечает?**
A: BFF возвращает данные из Redis-кэша или PostgreSQL `loyalty_cache` с флагом `isCached: true`. Мобильное приложение показывает баннер "Данные обновлены N минут назад".

**Q: Как тестировать SMS без реального провайдера?**
A: В `development` среде SMS-сервис использует mock-провайдер, который пишет OTP в лог сервера. Настраивается через `SMS_PRIMARY_PROVIDER=mock`.

**Q: Как добавить нового SMS-провайдера?**
A: Реализовать интерфейс `SmsGateway`, зарегистрировать как NestJS provider, добавить в фабрику `SmsService`.

**Q: Как устроена сегментация для push-кампаний?**
A: Сегменты приходят из системы лояльности через webhook `segment.changed` и хранятся в `loyalty_cache.segmentIds`. При создании кампании маркетолог выбирает сегменты → BFF выбирает `push_tokens` пользователей с нужными сегментами → batch отправка.
