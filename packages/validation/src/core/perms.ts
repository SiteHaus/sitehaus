/** Permission module definitions */
export type ModuleDefinition = {
  key: string;
  name: string;
  description: string;
  isCore: boolean;
  permissions: Record<string, readonly string[]>;
};

export const MODULES = {
  iam: {
    key: "iam",
    name: "Identity & Access",
    description: "User authentication, authorization, and identity management",
    isCore: true,
    permissions: {
      users: ["read", "write", "invite", "suspend"] as const,
      sessions: ["read", "revoke"] as const,
      roles: ["read", "manage", "assign"] as const,
      devices: ["read", "revoke", "rename"] as const,
      invites: ["read", "manage"] as const,
      members: ["read", "manage"] as const,
      clients: ["read", "manage", "view_hidden"] as const,
      audit: ["read"] as const,
    },
  },
  commerce: {
    key: "commerce",
    name: "Commerce",
    description: "Products, orders, and payment processing",
    isCore: false,
    permissions: {
      products: ["read", "write", "delete"] as const,
      orders: ["read", "write", "cancel"] as const,
      payments: ["read", "process", "refund"] as const,
    },
  },
  media: {
    key: "media",
    name: "Media",
    description: "File and folder management",
    isCore: false,
    permissions: {
      files: ["read", "write", "delete"] as const,
      folders: ["read", "write", "delete"] as const,
    },
  },
  analytics: {
    key: "analytics",
    name: "Analytics",
    description: "Reports and dashboards",
    isCore: false,
    permissions: {
      reports: ["read", "write", "delete"] as const,
      dashboards: ["read", "write", "delete"] as const,
    },
  },
  dashboard: {
    key: "dashboard",
    name: "Dashboard",
    description: "Project management, client collaboration, and agency operations",
    isCore: true,
    permissions: {
      projects: ["read", "manage"] as const,
      profiles: ["read", "manage"] as const,
      documents: ["read", "manage", "approve"] as const,
      tickets: ["read", "create", "manage"] as const,
      assets: ["read", "upload", "manage"] as const,
      comments: ["read", "create", "manage"] as const,
      billing: ["read", "manage"] as const,
    },
  },
} as const satisfies Record<string, ModuleDefinition>;

export type ModuleKey = keyof typeof MODULES;

/** For backwards compatibility - flat permission map for IAM module */
export const PERM = MODULES.iam.permissions;
export const DASHBOARD_PERM = MODULES.dashboard.permissions;

type IamResource = keyof typeof PERM;
type IamAction<R extends IamResource = IamResource> = (typeof PERM)[R][number];

type DashResource = keyof typeof DASHBOARD_PERM;
type DashAction<R extends DashResource = DashResource> = (typeof DASHBOARD_PERM)[R][number];

export type Permission = `${IamResource}:${IamAction}` | `${DashResource}:${DashAction}`;

/** Generate all permissions for a module */
function modulePermissions<M extends ModuleKey>(moduleKey: M): Array<{ perm: string; module: M }> {
  const mod = MODULES[moduleKey];
  return (Object.entries(mod.permissions) as [string, readonly string[]][]).flatMap(
    ([resource, actions]) =>
      actions.map((action) => ({
        perm: `${resource}:${action}`,
        module: moduleKey,
      })),
  );
}

/** All permissions with their module keys */
export const ALL_PERMISSIONS_WITH_MODULES = (Object.keys(MODULES) as ModuleKey[]).flatMap((key) =>
  modulePermissions(key),
);

/** Flat list of all core permission strings (IAM + Dashboard) */
export const ALL_PERMISSIONS: Permission[] = [
  ...modulePermissions("iam"),
  ...modulePermissions("dashboard"),
].map((p) => p.perm as Permission);

/** All permissions organized by module key */
export const PERMISSIONS_BY_MODULE = (Object.keys(MODULES) as ModuleKey[]).reduce(
  (acc, key) => {
    acc[key] = modulePermissions(key).map((p) => p.perm);
    return acc;
  },
  {} as Record<ModuleKey, string[]>,
);

const ALL_COMMERCE_PERMISSIONS = PERMISSIONS_BY_MODULE.commerce;

export const DEFAULT_ROLE_PERMS: Record<"admin" | "member" | "developer" | "client", string[]> = {
  admin: [...ALL_PERMISSIONS, ...ALL_COMMERCE_PERMISSIONS],
  member: [
    "sessions:read",
    "sessions:revoke",
    "devices:read",
    "devices:revoke",
    "products:read",
    "orders:read",
    "payments:read",
  ],
  developer: [...ALL_PERMISSIONS, "clients:view_hidden", ...ALL_COMMERCE_PERMISSIONS],
  client: [
    "projects:read",
    "profiles:read",
    "profiles:manage",
    "tickets:read",
    "tickets:create",
    "documents:read",
    "documents:approve",
    "assets:read",
    "assets:upload",
    "comments:read",
    "comments:create",
    "billing:read",
    "sessions:read",
    "sessions:revoke",
    "devices:read",
    "devices:revoke",
  ],
};

/** Permissions that grant access to organization-level IAM features */
export const ADMIN_PERMISSIONS: Permission[] = [
  "members:read",
  "members:manage",
  "roles:read",
  "roles:manage",
  "roles:assign",
  "invites:read",
  "invites:manage",
  "users:read",
  "users:write",
  "users:invite",
  "users:suspend",
  "clients:read",
  "clients:manage",
];

/** Get all modules as an array for seeding */
export function getModulesForSeed(): Array<{
  key: string;
  name: string;
  description: string;
  isCore: boolean;
}> {
  return Object.values(MODULES).map((m) => ({
    key: m.key,
    name: m.name,
    description: m.description,
    isCore: m.isCore,
  }));
}
