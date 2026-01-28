"use client";

import { ShieldX } from "lucide-react";

interface PermissionDeniedProps {
  resource: string;
  clientName?: string;
}

export function PermissionDenied({ resource, clientName }: PermissionDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <ShieldX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
      <p className="text-muted-foreground max-w-md">
        You don&apos;t have permission to manage {resource} for{" "}
        <span className="font-medium text-foreground">
          {clientName ?? "this client"}
        </span>
        . Contact an administrator to request access.
      </p>
    </div>
  );
}
