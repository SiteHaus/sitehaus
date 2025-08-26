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
import { DRIZZLE } from 'src/db/db.module';
import { IS_PUBLIC_KEY } from 'src/public.decorator';

type AccessPayload = {
  sub: string;
  sid: string;
  aud: string;
  iat: number;
  exp: number;
};

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    @Inject(DRIZZLE) private readonly db: Db,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;

    if (!auth?.startsWith('Bearer '))
      throw new UnauthorizedException('Missing token');

    const token = auth.slice('Bearer '.length);
    const payload = await this.jwt
      .verifyAsync<AccessPayload>(token, {
        algorithms: ['HS256'] as const,
      })
      .catch(() => {
        throw new UnauthorizedException('Invalid token');
      });

    const session = await this.db.query.sessionsTable.findFirst({
      where: (t, { eq, isNull, gt, and }) =>
        and(
          eq(t.id, payload.sid),
          isNull(t.revokedAt),
          gt(t.expiresAt, new Date()),
        ),
    });
    if (!session) throw new UnauthorizedException('Session Expired');

    (req as any).user = {
      userId: payload.sub,
      clientId: payload.aud,
      sessionId: payload.sid,
    } as const;

    return true;
  }
}
