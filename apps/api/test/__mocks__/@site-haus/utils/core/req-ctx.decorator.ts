import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const ReqCtx = createParamDecorator(
  (data: { headerName?: string } | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const header = data?.headerName ?? 'x-client-id';
    const clientId =
      (req.headers[header] as string | undefined) ?? 'test-client';
    return {
      clientId,
      ip: (req as any).ip,
      ua: req.headers['user-agent'] as string | undefined,
    };
  },
);
