"use client";

import { RequireAuth } from "@/lib/require-auth";
import { useApi } from "@/lib/typed-api";
import { ClientMember } from "@site-haus/contracts";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { DataTable } from "@site-haus/ui/components/shared/data-table/data-table";
import { useEffect, useState } from "react";

type ClientMemberKey = Extract<keyof ClientMember, string>;

const DEFAULT_COLUMNS: ClientMemberKey[] = [
  "email",
  "firstName",
  "lastName",
  "isVerified",
  "status",
];

export default function TeamPage() {
  const api = useApi();
  const authStore = useAuthStore();

  const [members, setMembers] = useState<ClientMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      const res = await api.clients.meMembers();

      if (cancelled) return;

      if (res.status === 200) {
        setMembers(res.body.members);
      } else {
        setError("Failed to load team members.");
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <RequireAuth>
      <div className="container mx-auto mt-12">
        <div className="mb-12">
          <h1 className="text-3xl font-bold">Your Team</h1>
          <p className="text-lg text-muted-foreground tracking-wide">
            Manage users, invites, roles, and permissions for this client.
          </p>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground">Loading team members…</p>
        )}

        {!loading && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {!loading && !error && (
          <DataTable<ClientMember>
            data={members}
            defaultColumns={DEFAULT_COLUMNS}
          />
        )}
      </div>
    </RequireAuth>
  );
}
