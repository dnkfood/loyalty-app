import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const response = ctx.getResponse<Response>();

    const requestId = (request.headers['x-request-id'] as string) ?? uuidv4();
    request.requestId = requestId;
    response.setHeader('X-Request-ID', requestId);

    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          this.logger.log(
            `${method} ${url} ${statusCode} ${duration}ms`,
            { requestId },
          );
        },
        error: (err: Error) => {
          const duration = Date.now() - startTime;
          this.logger.warn(
            `${method} ${url} ERROR ${duration}ms: ${err.message}`,
            { requestId },
          );
        },
      }),
    );
  }
}
