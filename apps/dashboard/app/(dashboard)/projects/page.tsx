"use client";

import { type ProjectItem } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import { Input } from "@site-haus/ui/components/base/input";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import {
  FolderKanban,
  Globe,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const statusVariant = (s: string) => {
  switch (s) {
    case "launched":
    case "completed":
      return "success";
    case "in_progress":
      return "warning";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
};

const billingVariant = (s: string | null) => {
  switch (s) {
    case "paid":
      return "success";
    case "late":
      return "destructive";
    case "outstanding":
      return "warning";
    default:
      return "secondary";
  }
};

const label = (s: string) =>
  s.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApi().projects.list({ query: { limit: 50 } });
      if (res.status === 200) {
        setProjects(res.body.projects);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filtered = search
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.type.toLowerCase().includes(search.toLowerCase()) ||
          p.status.toLowerCase().includes(search.toLowerCase())
      )
    : projects;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your web projects.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-6 text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No projects found</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {search
              ? "Try adjusting your search."
              : "Create your first project to get started."}
          </p>
          {!search && (
            <Button asChild className="mt-4" variant="outline">
              <Link href="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="transition-colors hover:border-primary/40 h-full">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
                      {project.name}
                    </CardTitle>
                    <Badge variant={statusVariant(project.status)}>
                      {label(project.status)}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2 mt-1">
                    {project.description || "No description"}
                  </CardDescription>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge variant="outline">{label(project.type)}</Badge>
                    {project.billingStatus && (
                      <Badge variant={billingVariant(project.billingStatus)}>
                        {label(project.billingStatus)}
                      </Badge>
                    )}
                    {project.siteDomain && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        {project.siteDomain}
                      </span>
                    )}
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
