import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export interface LighthausUser {
  userId: string;
  clientId: string;
  sessionId: string;
  /** True when the viewer is SiteHaus staff (admin on a first-party client). */
  isStaff: boolean;
}

export type AuthedRequest = Request & { user?: LighthausUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): LighthausUser => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.user!;
  },
);
