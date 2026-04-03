"use client";

import { useApi } from "@/lib/typed-api";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { AcceptInviteInput } from "@site-haus/validation/forms/invite";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AcceptInviteForm } from "./form/accept-invite-form";

interface InviteCheckResult {
  valid: boolean;
  userExists: boolean;
  clientName: string;
  roles: string[];
}

export default function AcceptInviteContainer() {
  const api = useApi();
  const searchParams = useSearchParams();

  const clientId = searchParams.get("clientId") ?? "";
  const email = searchParams.get("email") ?? "";
  const code = searchParams.get("code") ?? "";

  const [checkResult, setCheckResult] = useState<InviteCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkInvite = useCallback(async () => {
    if (!clientId || !email || !code) {
      setError("Invalid invite link. Missing required parameters.");
      setLoading(false);
      return;
    }

    try {
      const res = await api.invites.check({
        query: { clientId, email, code },
      });

      if (res.status === 200) {
        if (!res.body.valid) {
          setError("This invitation is invalid or has expired.");
        } else {
          setCheckResult(res.body);
        }
      } else {
        setError("Failed to verify invitation.");
      }
    } catch {
      setError("Failed to verify invitation. Please try again.");
    }
    setLoading(false);
  }, [api, clientId, email, code]);

  useEffect(() => {
    checkInvite();
  }, [checkInvite]);

  const onSubmit = async (values: AcceptInviteInput) => {
    const res = await api.invites.accept({ body: values });

    if (res.status === 200) {
      toast.success("Invitation accepted! Please log in to continue.");
      const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";
      window.location.href = dashboardUrl;
      return;
    }

    // Handle specific error cases
    if (res.status === 401) {
      throw new Error("Invalid or expired invitation code.");
    }
    if (res.status === 409) {
      throw new Error("This invitation has already been used.");
    }

    throw new Error("Failed to accept invitation. Please try again.");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Spinner className="h-8 w-8" />
        <p className="mt-4 text-muted-foreground">Verifying invitation...</p>
      </div>
    );
  }

  if (error || !checkResult) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <h2 className="text-xl font-semibold mb-2 text-destructive">Invalid Invitation</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <AcceptInviteForm
      onSubmit={onSubmit}
      defaultValues={{ clientId, email, code }}
      userExists={checkResult.userExists}
      clientName={checkResult.clientName}
      roles={checkResult.roles}
    />
  );
}
