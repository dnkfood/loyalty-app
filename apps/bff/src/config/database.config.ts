import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL ?? 'postgresql://loyalty:password@localhost:5432/loyalty_db',
}));
