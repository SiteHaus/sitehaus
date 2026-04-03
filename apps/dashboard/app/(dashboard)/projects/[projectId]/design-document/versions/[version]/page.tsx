"use client";

import { getApi } from "@site-haus/stores/api";
import { Button } from "@site-haus/ui/components/base/button";
import { Card, CardContent } from "@site-haus/ui/components/base/card";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { PlateEditor } from "@/components/plate-ui/plate-editor";
import { queryKeys } from "@/lib/query-keys";
import { formatDate } from "@site-haus/utils/core/format";

const formatDateTime = (d: string | null) =>
  formatDate(d, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }) ?? "";

export default function VersionDetailPage() {
  const { projectId, version } = useParams<{
    projectId: string;
    version: string;
  }>();

  const {
    data: versionData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.designDoc.version(projectId, version),
    queryFn: async () => {
      const res = await getApi().designDocuments.getVersion({
        params: { projectId, version },
      });
      if (res.status === 200) return res.body.version;
      return null;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (isError || !versionData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-lg font-medium">Version not found</h3>
        <Button asChild className="mt-4" variant="outline">
          <Link href={`/projects/${projectId}/design-document`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Current
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/projects/${projectId}/design-document`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Current
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Version {versionData.version}</h1>
        <div className="mt-1 text-sm text-muted-foreground">
          {versionData.createdBy && (
            <span>
              Published by {versionData.createdBy.firstName} {versionData.createdBy.lastName}
            </span>
          )}
          {versionData.createdAt && <span> &middot; {formatDateTime(versionData.createdAt)}</span>}
        </div>
        {versionData.changeNote && (
          <p className="mt-2 text-sm italic text-muted-foreground">
            &ldquo;{versionData.changeNote}&rdquo;
          </p>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <PlateEditor initialContent={versionData.content} readOnly />
        </CardContent>
      </Card>
    </div>
  );
}
