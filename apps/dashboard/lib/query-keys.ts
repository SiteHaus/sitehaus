export const queryKeys = {
  projects: {
    all: () => ["projects"] as const,
    list: () => ["projects", "list"] as const,
    detail: (id: string) => ["projects", id] as const,
  },
  milestones: {
    list: (projectId: string) => ["milestones", projectId] as const,
    upcoming: () => ["milestones", "upcoming"] as const,
  },
  assets: {
    list: (projectId: string) => ["assets", projectId] as const,
    detail: (projectId: string, assetId: string) =>
      ["assets", projectId, assetId] as const,
  },
  designDoc: {
    detail: (projectId: string) => ["design-doc", projectId] as const,
    versions: (projectId: string) =>
      ["design-doc", projectId, "versions"] as const,
  },
  billing: {
    project: (projectId: string) =>
      ["billing", "project", projectId] as const,
    admin: () => ["billing", "admin"] as const,
    client: (managedClientId: string | null) =>
      ["billing", "client", managedClientId] as const,
  },
  comments: {
    list: (targetType: string, targetId: string) =>
      ["comments", targetType, targetId] as const,
  },
  breadcrumb: {
    name: (id: string) => ["breadcrumb", id] as const,
  },
  tickets: {
    list: () => ["tickets"] as const,
  },
  businessProfile: {
    me: () => ["business-profile", "me"] as const,
  },
};
