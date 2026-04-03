import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: ['log', 'warn', 'error', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:5173');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // CORS
  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Loyalty-Signature'],
  });

  // Raw body middleware for webhook HMAC verification
  app.use(
    `/${apiPrefix}/webhooks`,
    (req: Request, _res: Response, next: NextFunction) => {
      json({
        verify: (req: Request & { rawBody?: Buffer }, _res: Response, buf: Buffer) => {
          req.rawBody = buf;
        },
      })(req, _res, next);
    },
  );

  // Standard body parsing for other routes
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true }));

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters & interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger (only in development)
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Loyalty App BFF API')
      .setDescription('Backend for Frontend — Restaurant Chain Loyalty Program')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication via OTP')
      .addTag('loyalty', 'Loyalty balance and transactions')
      .addTag('profile', 'User profile management')
      .addTag('offers', 'Personal offers')
      .addTag('promotions', 'General promotions')
      .addTag('webhooks', 'Incoming loyalty system webhooks')
      .addTag('admin', 'Admin panel endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger available at http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  logger.log(`BFF running on http://localhost:${port}/${apiPrefix}`);
}

void bootstrap();
