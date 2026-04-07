import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { extractRequestContext, RequestContext, RequestContextOptions } from "./request-context.js";

export const ReqCtx = createParamDecorator<RequestContextOptions | undefined>(
  (data: RequestContextOptions | undefined, ctx: ExecutionContext): RequestContext => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return extractRequestContext(req, data ?? {});
  },
);
