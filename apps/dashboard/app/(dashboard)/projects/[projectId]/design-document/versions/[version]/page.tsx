"use client";

import { type DesignDocumentVersionItem } from "@site-haus/contracts";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
} from "@site-haus/ui/components/base/card";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PlateEditor } from "@/components/plate-ui/plate-editor";
import { useDesignDocVersions } from "@/hooks/use-design-doc-versions";
import { formatDate } from "@site-haus/utils/core/format";

const formatDateTime = (d: string | null) =>
  formatDate(d, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) ?? "";

export default function VersionDetailPage() {
  const { projectId, version } = useParams<{
    projectId: string;
    version: string;
  }>();

  const { getVersion } = useDesignDocVersions(projectId);
  const [versionData, setVersionData] =
    useState<DesignDocumentVersionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchVersion = useCallback(async () => {
    setLoading(true);
    const v = await getVersion(version);
    if (v) {
      setVersionData(v);
    } else {
      setNotFound(true);
    }
    setLoading(false);
  }, [getVersion, version]);

  useEffect(() => {
    fetchVersion();
  }, [fetchVersion]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (notFound || !versionData) {
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
        <h1 className="text-2xl font-bold">
          Version {versionData.version}
        </h1>
        <div className="mt-1 text-sm text-muted-foreground">
          {versionData.createdBy && (
            <span>
              Published by {versionData.createdBy.firstName}{" "}
              {versionData.createdBy.lastName}
            </span>
          )}
          {versionData.createdAt && (
            <span> &middot; {formatDateTime(versionData.createdAt)}</span>
          )}
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
