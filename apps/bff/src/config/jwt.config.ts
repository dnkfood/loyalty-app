import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-min-32-chars',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-min-32-chars-refresh',
  accessTtl: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10),       // 15 minutes
  refreshTtl: parseInt(process.env.JWT_REFRESH_TTL ?? '2592000', 10), // 30 days
}));
