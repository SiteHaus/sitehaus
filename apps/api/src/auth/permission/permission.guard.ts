import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '@site-haus/validation/core/perms';
import { IS_PUBLIC_KEY } from 'src/public.decorator';
import { RolesService } from 'src/roles/roles.service';
import { REQ_PERMS_ALL, REQ_PERMS_ANY } from './require-perms.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly roles: RolesService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const requiredAll =
      this.reflector.getAllAndOverride<Permission[]>(REQ_PERMS_ALL, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? [];

    const requiredAny =
      this.reflector.getAllAndOverride<Permission[]>(REQ_PERMS_ANY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? [];

    if (requiredAll.length === 0 && requiredAny.length === 0) return true;

    const req = ctx
      .switchToHttp()
      .getRequest<{ user?: { userId: string; clientId: string }; client?: { id: string } }>();

    // Use target client from x-client-id header if set, otherwise fall back to session's client
    const targetClientId = req.client?.id ?? req.user.clientId;

    const perms = await this.roles.permsForUserClient(
      req.user.userId,
      targetClientId,
    );

    const hasAll = requiredAll.every((p) => perms.has(p));
    const hasAny =
      requiredAny.length === 0 || requiredAny.some((p) => perms.has(p));

    if (hasAll && hasAny) return true;

    throw new ForbiddenException('Insufficient permissions');
  }
}
