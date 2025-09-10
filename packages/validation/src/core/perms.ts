export const PERM = {
  users: ["read", "write", "invite", "suspend"] as const,
  sessions: ["read", "revoke"] as const,
  roles: ["read", "manage", "assign"] as const,
  devices: ["read", "revoke", "rename"] as const,
} as const;

type Resource = keyof typeof PERM;
type Action<R extends Resource = Resource> = (typeof PERM)[R][number];
export type Permission = `${Resource}:${Action}`;

export const ALL_PERMISSIONS: Permission[] = (
  Object.entries(PERM) as [Resource, readonly string[]][]
).flatMap(([res, actions]) => actions.map((a) => `${res}:${a}` as Permission));
