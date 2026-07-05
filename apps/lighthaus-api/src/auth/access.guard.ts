import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { MonitorRepository } from "../persistence/monitor.repository";
import type { AuthedRequest } from "./current-user.decorator";

/** IAM access-token claims (mirrors apps/api AccessPayload). */
interface AccessPayload {
  sub: string;
  sid: string;
  aud: string;
  iat: number;
  exp: number;
  mfa?: "pending" | "complete";
}

/**
 * Validates an IAM access token exactly as apps/api does — verify the signature
 * with the shared secret, then confirm the session row is live — and additionally
 * resolves whether the viewer is SiteHaus staff so downstream scoping is trivial.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly repo: MonitorRepository,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedException("Missing token");

    const token = auth.slice("Bearer ".length);
    const payload = await this.jwt.verifyAsync<AccessPayload>(token).catch(() => {
      throw new UnauthorizedException("Invalid token");
    });

    // A token minted mid-2FA carries mfa: "pending". apps/api blocks every
    // protected route in that state; the status board is fully protected, so
    // do the same — a half-authenticated session must not read tenant data.
    if (payload.mfa === "pending") throw new ForbiddenException("MFA verification required");

    const live = await this.repo.sessionValid(payload.sid, payload.aud);
    if (!live) throw new UnauthorizedException("Session Expired");

    req.user = {
      userId: payload.sub,
      clientId: payload.aud,
      sessionId: payload.sid,
      isStaff: await this.repo.isStaffAdmin(payload.sub),
    };
    return true;
  }
}
