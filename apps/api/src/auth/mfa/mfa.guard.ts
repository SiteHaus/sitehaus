import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/public.decorator';
import type { UserContext } from '../access/access.guard';
import { IS_MFA_OPTIONAL, IS_MFA_PENDING } from './mfa.decorator';

@Injectable()
export class MfaGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // Public routes skip MFA check
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    // MFA optional routes skip MFA check
    const isMfaOptional = this.reflector.getAllAndOverride<boolean>(
      IS_MFA_OPTIONAL,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (isMfaOptional) return true;

    // Check if this route requires MFA pending status
    const requiresMfaPending = this.reflector.getAllAndOverride<boolean>(
      IS_MFA_PENDING,
      [ctx.getHandler(), ctx.getClass()],
    );

    const req = ctx.switchToHttp().getRequest<{ user?: UserContext }>();
    const mfaStatus = req.user?.mfa;

    // If route requires MFA pending, only allow if status is 'pending'
    if (requiresMfaPending) {
      if (mfaStatus !== 'pending') {
        throw new ForbiddenException(
          'This endpoint requires pending MFA verification',
        );
      }
      return true;
    }

    // For all other protected routes, block if MFA is pending
    if (mfaStatus === 'pending') {
      throw new ForbiddenException('MFA verification required');
    }

    return true;
  }
}
