import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { ProfileModule } from './modules/profile/profile.module';
import { OffersModule } from './modules/offers/offers.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AdminModule } from './modules/admin/admin.module';
import { InboxModule } from './modules/notifications/inbox/inbox.module';
import { DevicesModule } from './modules/devices/devices.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import jwtConfig from './config/jwt.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
      envFilePath: ['.env', '.env.local'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'admin', 'dist'),
      serveRoot: '/admin',
      // Explicit Express 4 wildcard. @nestjs/serve-static@5 defaults to the
      // Express 5 syntax '{*any}', which silently fails to register a route
      // under @nestjs/platform-express@10 (Express 4) and breaks the SPA
      // fallback for deep links like /admin/login.
      renderPath: '*',
      serveStaticOptions: { fallthrough: true },
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    LoyaltyModule,
    ProfileModule,
    OffersModule,
    PromotionsModule,
    WebhooksModule,
    AdminModule,
    InboxModule,
    DevicesModule,
  ],
})
export class AppModule {}
