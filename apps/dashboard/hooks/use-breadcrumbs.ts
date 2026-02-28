"use client";

import { getApi } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { useQueries } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { queryKeys } from "@/lib/query-keys";

export type Crumb = { label: string; href: string };

const STATIC_LABELS: Record<string, string> = {
  projects: "Projects",
  new: "New Project",
  edit: "Edit",
  assets: "Assets",
  milestones: "Milestones",
  "design-document": "Design Document",
  profile: "Business Profile",
  clients: "Clients",
  all: "All Clients",
  "business-profile": "Business Profile",
  tickets: "Tickets",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useBreadcrumbs(): Crumb[] {
  const pathname = usePathname();
  const clients = useAuthStore((s) => s.clients);

  const segments = pathname.split("/").filter(Boolean);

  // Identify UUID segments that need async resolution
  const uuidSegments = segments
    .map((seg, i) => ({ seg, i, prev: segments[i - 1] }))
    .filter(({ seg }) => UUID_RE.test(seg));

  // Fetch names for UUID segments via React Query (uses cache automatically)
  const nameQueries = useQueries({
    queries: uuidSegments.map(({ seg, prev }) => ({
      queryKey: queryKeys.breadcrumb.name(seg),
      queryFn: async (): Promise<string> => {
        if (prev === "projects") {
          const res = await getApi().projects.get({ params: { projectId: seg } });
          if (res.status === 200) return res.body.project.name;
        }
        if (prev === "clients") {
          const client = clients.find((c) => c.id === seg);
          if (client) return client.name;
        }
        return seg;
      },
      staleTime: Infinity, // names don't change during a session
    })),
  });

  // Build a map from UUID → resolved name
  const nameMap = new Map<string, string>();
  uuidSegments.forEach(({ seg }, idx) => {
    const result = nameQueries[idx];
    if (result?.data) nameMap.set(seg, result.data);
  });

  return segments.map((seg, i) => ({
    label: UUID_RE.test(seg)
      ? (nameMap.get(seg) ?? "…")
      : (STATIC_LABELS[seg] ?? seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));
}
