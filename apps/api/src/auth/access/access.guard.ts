import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { type Db } from '@site-haus/db';
import { Request } from 'express';
import { DRIZZLE } from 'src/db/tokens';
import { IS_PUBLIC_KEY } from 'src/public.decorator';
import { SessionService } from 'src/session/session.service';

export type AccessPayload = {
  sub: string;
  sid: string;
  aud: string;
  iat: number;
  exp: number;
  mfa?: 'pending' | 'complete';
};

export type UserContext = {
  userId: string;
  clientId: string;
  sessionId: string;
  firstName?: string;
  lastName?: string;
  mfa?: 'pending' | 'complete';
};
export type AuthedRequest = Request & { user?: UserContext };

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    @Inject(DRIZZLE) private readonly db: Db,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    const req = ctx
      .switchToHttp()
      .getRequest<AuthedRequest & { client?: { id: string } }>();
    const auth = req.headers.authorization;

    // For public routes, still try to populate req.user if token is present
    if (isPublic) {
      if (!auth?.startsWith('Bearer ')) {
        return true; // No token, but route is public, so allow access
      }
      // Has token, continue to populate req.user
    } else {
      // For protected routes, require token
      if (!auth?.startsWith('Bearer '))
        throw new UnauthorizedException('Missing token');
    }

    const token = auth.slice('Bearer '.length);
    const payload = await this.jwt
      .verifyAsync<AccessPayload>(token)
      .catch(() => {
        throw new UnauthorizedException('Invalid token');
      });

    const session = await this.db.query.sessionsTable.findFirst({
      where: (t, { eq, isNull, gt, and }) =>
        and(
          eq(t.id, payload.sid),
          eq(t.clientId, payload.aud),
          isNull(t.revokedAt),
          gt(t.expiresAt, new Date()),
        ),
      with: {
        client: {
          columns: { firstParty: true },
        },
      },
    });
    if (!session) throw new UnauthorizedException('Session Expired');

    const clientInReq = req.client?.id;
    if (clientInReq && clientInReq !== payload.aud) {
      // Allow first-party clients to make cross-client requests
      if (!session.client?.firstParty) {
        throw new UnauthorizedException('Token audience mismatch');
      }
    }

    req.user = {
      userId: payload.sub,
      clientId: payload.aud,
      sessionId: payload.sid,
      mfa: payload.mfa,
    };

    await this.sessions.touch(
      payload.sid,
      req.ip,
      req.headers['user-agent'] as string | undefined,
    );

    return true;
  }
}
