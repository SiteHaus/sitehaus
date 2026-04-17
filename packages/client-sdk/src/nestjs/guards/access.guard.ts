import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import { IntrospectionService } from "../services/introspection.service.js";
import type { AuthedRequest, UserContext } from "../types.js";

/**
 * Guard that validates access tokens via IAM introspection.
 * Populates req.user with UserContext on successful validation.
 *
 * Use @Public() decorator to skip authentication for specific routes.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly introspection: IntrospectionService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    const request = ctx.switchToHttp().getRequest<AuthedRequest>();
    const auth = (request as any).headers?.authorization as string | undefined;

    // For public routes, still try to populate req.user if token is present
    if (isPublic) {
      if (!auth?.startsWith("Bearer ")) {
        return true; // No token, but route is public
      }
      // Has token, continue to populate req.user
    } else {
      // For protected routes, require token
      if (!auth?.startsWith("Bearer ")) {
        throw new UnauthorizedException("Missing token");
      }
    }

    const token = auth.slice("Bearer ".length);
    const result = await this.introspection.introspect(token);

    if (!result.active) {
      if (isPublic) {
        return true; // Token invalid but route is public
      }
      throw new UnauthorizedException("Invalid or expired token");
    }

    // Populate user context
    const userContext: UserContext = {
      userId: result.user!.id,
      email: result.user!.email,
      firstName: result.user!.firstName,
      lastName: result.user!.lastName,
      isVerified: result.user!.isVerified,
      status: result.user!.status,
      sessionId: result.session!.id,
      clientId: result.session!.clientId,
      permissions: result.permissions ?? [],
      clientIsFirstParty: result.session!.clientIsFirstParty ?? false,
    };

    request.user = userContext;
    return true;
  }
}
