"use client";

import type { DesignDocumentVersionItem } from "@site-haus/contracts";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import { formatDate } from "@site-haus/utils/core/format";
import Link from "next/link";
import { useState } from "react";

const formatDateTime = (d: string | null) =>
  formatDate(d, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) ?? "";

export function VersionHistory({
  projectId,
  versions,
  loading,
}: {
  projectId: string;
  versions: DesignDocumentVersionItem[];
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner className="size-4 text-muted-foreground" />
      </div>
    );
  }

  if (versions.length === 0) return null;

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Version History ({versions.length})
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="space-y-3">
            {versions
              .sort((a, b) => b.version - a.version)
              .map((v) => (
                <div
                  key={v.id}
                  className="flex items-start justify-between gap-4 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">Version {v.version}</p>
                    {v.changeNote && (
                      <p className="text-muted-foreground truncate">
                        {v.changeNote}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {v.createdBy
                        ? `${v.createdBy.firstName} ${v.createdBy.lastName}`
                        : "Unknown"}{" "}
                      &middot; {formatDateTime(v.createdAt)}
                    </p>
                  </div>
                  <Button asChild size="xs" variant="ghost">
                    <Link
                      href={`/projects/${projectId}/design-document/versions/${v.version}`}
                    >
                      View
                    </Link>
                  </Button>
                </div>
              ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
