import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthedRequest, UserContext } from "../types.js";

/**
 * Extract the current user from the request.
 * Must be used on routes protected by AccessGuard.
 *
 * @example
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: UserContext) {
 *   return { email: user.email };
 * }
 *
 * // Access specific property
 * @Get('my-id')
 * getMyId(@CurrentUser('userId') userId: string) {
 *   return { userId };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof UserContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthedRequest>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
