import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof ZodError) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: {
          type: 'validation_error',
          message: 'Invalid request payload',
          details: exception.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
        },
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse();
      const message =
        typeof resp === 'string' ? resp : ((resp as any).message ?? 'Error');

      const hdrs =
        (typeof resp === 'object' && (resp as any).headers) || undefined;
      if (hdrs && typeof hdrs === 'object') {
        for (const [k, v] of Object.entries(hdrs)) res.setHeader(k, String(v));
      }

      const extra = typeof resp === 'object' ? resp : {};
      return res
        .status(status)
        .json({ error: { type: 'http_error' }, message, ...extra });
    }

    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: { type: 'server_error', message: 'Unexpected Error' } });
  }
}
