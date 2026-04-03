import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ErrorCodes } from '@loyalty/shared-types';

interface ErrorBody {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = uuidv4();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: string = ErrorCodes.INTERNAL_ERROR;
    let message = 'Internal server error';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as ErrorBody;
        errorCode = body.code ?? this.statusToErrorCode(status);
        message = body.message ?? exception.message;
        details = body.details;
      } else {
        message = String(exceptionResponse);
        errorCode = this.statusToErrorCode(status);
      }
    } else {
      this.logger.error(
        `Unhandled exception: ${(exception as Error).message}`,
        (exception as Error).stack,
        { requestId, url: request.url },
      );
    }

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message,
        ...(details ? { details } : {}),
      },
      meta: { requestId },
    });
  }

  private statusToErrorCode(status: number): string {
    const map: Record<number, string> = {
      400: ErrorCodes.VALIDATION_ERROR,
      401: ErrorCodes.TOKEN_INVALID,
      403: ErrorCodes.FORBIDDEN,
      404: ErrorCodes.NOT_FOUND,
      429: ErrorCodes.RATE_LIMITED,
    };
    return map[status] ?? ErrorCodes.INTERNAL_ERROR;
  }
}
