import { SetMetadata } from "@nestjs/common";

export const REQ_PERMS_ALL = "requirePermissionsAll";
export const REQ_PERMS_ANY = "requirePermissionsAny";

/**
 * Require ALL specified permissions to access a route.
 *
 * @example
 * ```typescript
 * @RequirePerms('users:read', 'users:write')
 * @Get('users')
 * getUsers() { }
 * ```
 */
export const RequirePerms = (...permissions: string[]) => SetMetadata(REQ_PERMS_ALL, permissions);

/**
 * Require ANY of the specified permissions to access a route.
 *
 * @example
 * ```typescript
 * @RequirePermsAny('admin', 'users:manage')
 * @Delete('user/:id')
 * deleteUser() { }
 * ```
 */
export const RequirePermsAny = (...permissions: string[]) =>
  SetMetadata(REQ_PERMS_ANY, permissions);
