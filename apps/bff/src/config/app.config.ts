import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim()),
  rateLimiting: {
    otpSendMax: parseInt(process.env.RATE_LIMIT_OTP_SEND_MAX ?? '3', 10),
    otpSendWindow: parseInt(process.env.RATE_LIMIT_OTP_SEND_WINDOW ?? '600', 10),
    otpVerifyMax: parseInt(process.env.RATE_LIMIT_OTP_VERIFY_MAX ?? '5', 10),
    otpVerifyWindow: parseInt(process.env.RATE_LIMIT_OTP_VERIFY_WINDOW ?? '600', 10),
  },
  push: {
    maxPerUserPerDay: parseInt(process.env.PUSH_MAX_PER_USER_PER_DAY ?? '3', 10),
    fcm: { serverKey: process.env.FCM_SERVER_KEY ?? '' },
    apns: {
      keyId: process.env.APNS_KEY_ID ?? '',
      teamId: process.env.APNS_TEAM_ID ?? '',
      bundleId: process.env.APNS_BUNDLE_ID ?? '',
      keyPath: process.env.APNS_KEY_PATH ?? '',
    },
  },
  sms: {
    primaryProvider: process.env.SMS_PRIMARY_PROVIDER ?? 'beeline',
    beeline: {
      apiUrl: process.env.BEELINE_SMS_API_URL ?? 'https://a2p-sms-https.beeline.ru/proto/http/',
      login: process.env.BEELINE_SMS_LOGIN ?? '',
      password: process.env.BEELINE_SMS_PASSWORD ?? '',
      sender: process.env.BEELINE_SMS_SENDER ?? 'DNKFOOD',
    },
    alfa: {
      apiUrl: process.env.ALFA_SMS_API_URL ?? '',
      apiKey: process.env.ALFA_SMS_API_KEY ?? '',
      login: process.env.ALFA_SMS_LOGIN ?? '',
      password: process.env.ALFA_SMS_PASSWORD ?? '',
    },
  },
  loyaltySystem: {
    apiUrl: process.env.LOYALTY_SYSTEM_API_URL ?? '',
    apiKey: process.env.LOYALTY_SYSTEM_API_KEY ?? '',
    webhookSecret: process.env.LOYALTY_WEBHOOK_SECRET ?? '',
  },
}));
