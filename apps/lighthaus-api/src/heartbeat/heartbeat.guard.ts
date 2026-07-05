import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";

/**
 * Guards heartbeat ingest with a shared secret. Heartbeat pushers are services,
 * not IAM users, so we authenticate them with a per-deploy bearer secret rather
 * than a JWT. Fails CLOSED: if no secret is configured the endpoint is disabled,
 * so a forgotten env var can never silently leave ingest wide open — an
 * unauthenticated pusher could otherwise forge "up" pings and mask a real outage.
 */
@Injectable()
export class HeartbeatIngestGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const secret = this.config.get<string>("lighthaus.heartbeatSecret") ?? "";
    if (!secret) {
      throw new ServiceUnavailableException("Heartbeat ingest not configured");
    }

    const auth = ctx.switchToHttp().getRequest<Request>().headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing heartbeat token");
    }
    if (!safeEqual(auth.slice("Bearer ".length), secret)) {
      throw new UnauthorizedException("Invalid heartbeat token");
    }
    return true;
  }
}

/** Constant-time compare that tolerates length mismatch without early-return leaks. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
