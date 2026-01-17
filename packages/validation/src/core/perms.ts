export const PERM = {
  users: ["read", "write", "invite", "suspend"] as const,
  sessions: ["read", "revoke"] as const,
  roles: ["read", "manage", "assign"] as const,
  devices: ["read", "revoke", "rename"] as const,
  invites: ["read", "manage"] as const,
  members: ["read", "manage"] as const,
} as const;

type Resource = keyof typeof PERM;
type Action<R extends Resource = Resource> = (typeof PERM)[R][number];
export type Permission = `${Resource}:${Action}`;

export const ALL_PERMISSIONS: Permission[] = (
  Object.entries(PERM) as [Resource, readonly string[]][]
).flatMap(([res, actions]) => actions.map((a) => `${res}:${a}` as Permission));

export const DEFAULT_ROLE_PERMS: Record<"admin" | "member", Permission[]> = {
  admin: [...ALL_PERMISSIONS],
  member: [
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
];
