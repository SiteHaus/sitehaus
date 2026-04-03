"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

interface RequireParamsProps {
  requireClient?: boolean;
  requireNext?: boolean;
  children: ReactNode;
}

export function RequireParams({
  requireClient = false,
  requireNext = false,
  children,
}: RequireParamsProps) {
  const sp = useSearchParams();
  const client = sp.get("client");
  const next = sp.get("next");

  if (requireClient && !client) return <UnauthorizedMessage missing="client" />;
  if (requireNext && !next) return <UnauthorizedMessage missing="next" />;

  return <>{children}</>;
}

function UnauthorizedMessage({ missing }: { missing: "client" | "next" | undefined }) {
  return (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-semibold mb-2">Missing required parameter</h1>
      <p className="text-muted-foreground mb-4">
        This page must be reached from an approved Site Haus application.
        {missing ? <> The “{missing}” parameter is required.</> : null}
      </p>
      <p className="text-muted-foreground">
        If you think this is a mistake, contact{" "}
        <Link href="mailto:support@notify.sitehaus.dev" className="underline">
          support@notify.sitehaus.dev
        </Link>
        .
      </p>
    </main>
  );
}
