import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Db } from '@site-haus/db';
import { DRIZZLE } from 'src/db/tokens';
import { IS_PUBLIC_KEY } from 'src/public.decorator';

export const IS_VERIFIED_OPTIONAL = 'isVerifiedOptional';
export const VerifiedOptional = () => SetMetadata(IS_VERIFIED_OPTIONAL, true);

@Injectable()
export class VerifiedGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DRIZZLE) private readonly db: Db,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const isOptional = this.reflector.getAllAndOverride<boolean>(
      IS_VERIFIED_OPTIONAL,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (isOptional) return true;

    const req = ctx.switchToHttp().getRequest<{ user?: { userId: string } }>();
    if (!req.user.userId) {
      throw new UnauthorizedException('Missing user context');
    }

    const u = await this.db.query.usersTable.findFirst({
      where: (t, { eq }) => eq(t.id, req.user.userId),
    });
    if (!u) throw new UnauthorizedException('Unknown user');
    if (!u.isVerified) throw new ForbiddenException('Email not verified');

    return true;
  }
}
