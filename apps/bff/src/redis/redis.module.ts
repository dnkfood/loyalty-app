import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('RedisModule');
        let url = config.get<string>('REDIS_URL', 'redis://localhost:6379');

        // Validate the URL before passing to ioredis. ioredis uses the
        // legacy url.parse() which silently produces { port: '' } for
        // malformed URLs like 'redis://localhost:' → parseInt('') = NaN
        // → ERR_SOCKET_BAD_PORT.
        try {
          const parsed = new URL(url);
          logger.log(
            `Redis URL: ${parsed.protocol}//${parsed.hostname}:${parsed.port || '6379'} (db: ${parsed.pathname?.slice(1) || '0'})`,
          );
          if (!parsed.port) {
            // URL like 'redis://localhost' without explicit port — ioredis
            // defaults to 6379, but let's be explicit to avoid url.parse() edge cases.
            url = `${parsed.protocol}//${parsed.username ? parsed.username + ':' + parsed.password + '@' : ''}${parsed.hostname}:6379${parsed.pathname}`;
            logger.log(`Redis URL normalized (added explicit port): ${parsed.hostname}:6379`);
          }
        } catch {
          logger.error(
            `Invalid REDIS_URL: "${url}" — falling back to redis://localhost:6379. ` +
            `Check .env for invisible characters, wrong encoding, or missing port.`,
          );
          url = 'redis://localhost:6379';
        }

        const client = new Redis(url, {
          maxRetriesPerRequest: 3,
          retryStrategy(times) {
            return Math.min(times * 200, 2000);
          },
        });

        client.on('connect', () => logger.log(`Connected to Redis at ${url}`));
        client.on('error', (err) => logger.error(`Redis error: ${err.message}`));

        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
