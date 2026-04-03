import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface TransformedResponse<T> {
  success: true;
  data: T;
  meta: {
    requestId: string;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, TransformedResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<TransformedResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const response = ctx.getResponse<Response>();

    const requestId = request.requestId ?? (response.getHeader('X-Request-ID') as string) ?? uuidv4();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        meta: { requestId },
      })),
    );
  }
}
