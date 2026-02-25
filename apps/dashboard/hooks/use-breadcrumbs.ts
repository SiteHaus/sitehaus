"use client";

import { getApi } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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

// Module-level cache so names persist across navigations
const nameCache = new Map<string, string>();

function buildCrumbs(segments: string[]): Crumb[] {
  return segments.map((seg, i) => ({
    label: UUID_RE.test(seg)
      ? (nameCache.get(seg) ?? "…")
      : (STATIC_LABELS[seg] ?? seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));
}

export function useBreadcrumbs(): Crumb[] {
  const pathname = usePathname();
  const clients = useAuthStore((s) => s.clients);

  const segments = pathname.split("/").filter(Boolean);
  const [crumbs, setCrumbs] = useState<Crumb[]>(() => buildCrumbs(segments));

  useEffect(() => {
    setCrumbs(buildCrumbs(segments));

    const uuidSegments = segments
      .map((seg, i) => ({ seg, i, prev: segments[i - 1] }))
      .filter(({ seg }) => UUID_RE.test(seg) && !nameCache.has(seg));

    if (uuidSegments.length === 0) return;

    Promise.all(
      uuidSegments.map(async ({ seg, i, prev }) => {
        if (prev === "projects") {
          try {
            const res = await getApi().projects.get({
              params: { projectId: seg },
            });
            if (res.status === 200) {
              nameCache.set(seg, res.body.project.name);
              return { index: i, name: res.body.project.name };
            }
          } catch {
            // silently fail
          }
        }

        if (prev === "clients") {
          const client = clients.find((c) => c.id === seg);
          if (client) {
            nameCache.set(seg, client.name);
            return { index: i, name: client.name };
          }
        }

        return null;
      })
    ).then((results) => {
      const resolved = results.filter(
        Boolean
      ) as { index: number; name: string }[];
      if (resolved.length === 0) return;
      setCrumbs((prev) => {
        const next = [...prev];
        for (const { index, name } of resolved) {
          const crumb = next[index];
          if (crumb) next[index] = { ...crumb, label: name };
        }
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return crumbs;
}
