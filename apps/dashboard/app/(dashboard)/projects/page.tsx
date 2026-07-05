"use client";

import { billingVariant, statusVariant } from "@/lib/variants";
import { type ProjectItem } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@site-haus/ui/components/base/card";
import { Input } from "@site-haus/ui/components/base/input";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { label } from "@site-haus/utils/core/format";
import { FolderKanban, Globe, Mail, Phone, Plus, Search } from "lucide-react";
import { PageHero } from "@site-haus/ui/components/shared/page-hero";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function ProjectsPage() {
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const canManage = hasPerm("projects:manage");

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
          p.status.toLowerCase().includes(search.toLowerCase()),
      )
    : projects;

  return (
    <div className="space-y-6">
      <PageHero icon={FolderKanban} title="Projects" subtitle="Manage all your web projects.">
        {canManage && (
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        )}
      </PageHero>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-6 text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
          {search ? (
            <>
              <h3 className="text-lg font-medium">No projects found</h3>
              <p className="text-muted-foreground mt-1 text-sm">Try adjusting your search.</p>
            </>
          ) : canManage ? (
            <>
              <h3 className="text-lg font-medium">No projects yet</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Create your first project to get started.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/projects/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Link>
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium">No projects here yet</h3>
              <p className="text-muted-foreground mt-2 text-sm max-w-sm">
                It looks like your account doesn&apos;t have any projects set up yet. Reach out to
                us and we&apos;ll get things moving.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button asChild variant="outline">
                  <a href="mailto:hello@sitehaus.com">
                    <Mail className="mr-2 h-4 w-4" />
                    hello@sitehaus.com
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href="tel:+15555555555">
                    <Phone className="mr-2 h-4 w-4" />
                    (555) 555-5555
                  </a>
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="transition-colors hover:border-primary/40 h-full">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{project.name}</CardTitle>
                    <Badge variant={statusVariant(project.status)}>{label(project.status)}</Badge>
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
