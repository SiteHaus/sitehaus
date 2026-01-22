// Module
export { SiteHausAuthModule } from "./sitehaus-auth.module.js";

// Guards
export { AccessGuard } from "./guards/access.guard.js";
export { PermissionGuard } from "./guards/permission.guard.js";

// Decorators
export { Public, IS_PUBLIC_KEY } from "./decorators/public.decorator.js";
export { CurrentUser } from "./decorators/current-user.decorator.js";
export {
  RequirePerms,
  RequirePermsAny,
  REQ_PERMS_ALL,
  REQ_PERMS_ANY,
} from "./decorators/require-perms.decorator.js";

// Services
export {
  IntrospectionService,
  SITEHAUS_AUTH_CONFIG,
} from "./services/introspection.service.js";

// Types
export type {
  SiteHausAuthConfig,
  UserContext,
  IntrospectionResponse,
  AuthedRequest,
} from "./types.js";
