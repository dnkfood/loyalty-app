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
        const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
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
