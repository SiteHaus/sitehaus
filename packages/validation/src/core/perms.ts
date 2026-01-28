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
} as const satisfies Record<string, ModuleDefinition>;

export type ModuleKey = keyof typeof MODULES;

/** For backwards compatibility - flat permission map for IAM module */
export const PERM = MODULES.iam.permissions;

type Resource = keyof typeof PERM;
type Action<R extends Resource = Resource> = (typeof PERM)[R][number];
export type Permission = `${Resource}:${Action}`;

/** Generate all permissions for a module */
function modulePermissions<M extends ModuleKey>(
  moduleKey: M
): Array<{ perm: string; module: M }> {
  const mod = MODULES[moduleKey];
  return (
    Object.entries(mod.permissions) as [string, readonly string[]][]
  ).flatMap(([resource, actions]) =>
    actions.map((action) => ({
      perm: `${resource}:${action}`,
      module: moduleKey,
    }))
  );
}

/** All permissions with their module keys */
export const ALL_PERMISSIONS_WITH_MODULES = (
  Object.keys(MODULES) as ModuleKey[]
).flatMap((key) => modulePermissions(key));

/** Flat list of all permission strings (for backwards compat) */
export const ALL_PERMISSIONS: Permission[] = modulePermissions("iam").map(
  (p) => p.perm as Permission
);

/** All permissions organized by module key */
export const PERMISSIONS_BY_MODULE = (
  Object.keys(MODULES) as ModuleKey[]
).reduce(
  (acc, key) => {
    acc[key] = modulePermissions(key).map((p) => p.perm);
    return acc;
  },
  {} as Record<ModuleKey, string[]>
);

export const DEFAULT_ROLE_PERMS: Record<"admin" | "member" | "developer", Permission[]> = {
  admin: [...ALL_PERMISSIONS],
  member: [
    "sessions:read",
    "sessions:revoke",
    "devices:read",
    "devices:revoke",
  ],
  developer: [
    ...ALL_PERMISSIONS,
    "clients:view_hidden",
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
