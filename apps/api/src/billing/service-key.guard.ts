import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

/**
 * Minimum plausible length for the shared service key. Anything shorter is
 * treated as "not configured" rather than as a usable secret.
 */
const MIN_KEY_LENGTH = 16;

/**
 * Shared-secret authorization for the cross-repo service call from
 * sitehaus-commerce. This is the real authorization for
 * BillingInternalController — the controller is @Public() only so the global
 * user-auth AccessGuard doesn't 401 a request that legitimately carries no
 * bearer token.
 */
@Injectable()
export class ServiceKeyGuard implements CanActivate {
  private readonly logger = new Logger(ServiceKeyGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const provided = req.headers['x-service-key'];

    // `getOrThrow` only throws when the var is entirely absent. An empty or
    // stub value (`.env.example` ships `COMMERCE_SERVICE_KEY=`) is a perfectly
    // valid config value, and comparing against it would let any caller in by
    // sending the same empty header — a fail-open. Treat an unusable secret as
    // "deny everything" instead.
    const expected = this.config.getOrThrow<string>('COMMERCE_SERVICE_KEY');
    if (typeof expected !== 'string' || expected.length < MIN_KEY_LENGTH) {
      this.logger.error(
        `COMMERCE_SERVICE_KEY is unset or too short (< ${MIN_KEY_LENGTH} chars) — refusing every internal service request.`,
      );
      return false;
    }

    if (typeof provided !== 'string') return false;

    // Constant-time comparison, so a caller can't recover the key one byte at a
    // time from response-timing differences. timingSafeEqual throws on
    // mismatched lengths, so the length check has to come first — that leaks
    // only the key's length, which `===` leaked anyway.
    const providedBuf = Buffer.from(provided, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');
    if (providedBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(providedBuf, expectedBuf);
  }
}
