import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import {
  REQ_PERMS_ALL,
  REQ_PERMS_ANY,
} from "../decorators/require-perms.decorator.js";
import type { AuthedRequest } from "../types.js";

/**
 * Guard that checks user permissions from the introspection result.
 * Must be used after AccessGuard.
 *
 * Use @RequirePerms() for requiring ALL permissions.
 * Use @RequirePermsAny() for requiring ANY of the permissions.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const requiredAll =
      this.reflector.getAllAndOverride<string[]>(REQ_PERMS_ALL, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? [];

    const requiredAny =
      this.reflector.getAllAndOverride<string[]>(REQ_PERMS_ANY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? [];

    // If no permissions required, allow access
    if (requiredAll.length === 0 && requiredAny.length === 0) {
      return true;
    }

    const request = ctx.switchToHttp().getRequest<AuthedRequest>();
    const userPerms = new Set(request.user?.permissions ?? []);

    // Check ALL permissions are present
    const hasAll = requiredAll.every((p) => userPerms.has(p));

    // Check ANY permission is present (or no ANY requirements)
    const hasAny =
      requiredAny.length === 0 || requiredAny.some((p) => userPerms.has(p));

    if (hasAll && hasAny) {
      return true;
    }

    throw new ForbiddenException("Insufficient permissions");
  }
}
