"use client";

import { RequireAuth } from "@/lib/require-auth";
import { useApi } from "@/lib/typed-api";
import { ClientMember } from "@site-haus/contracts";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Button } from "@site-haus/ui/components/base/button";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";

export default function TeamPage() {
  const api = useApi();
  const authStore = useAuthStore();

  const [members, setMembers] = useState<ClientMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      const res = await api.clients.meMembers();

      if (!cancelled && res.status === 200) {
        setMembers(res.body.members);
      }

      setLoading(false);
    })();
  }, [api]);

  return (
    <RequireAuth>
      <div>
        <h1>Team Page Here</h1>
        <p>
          This is the team page for your team! Manage users, invites, roles, and
          permissions.
        </p>
        {members.map((m: ClientMember) => (
          <div key={m.email}>
            {m.email}
            {m.id}
          </div>
        ))}
        <Button onClick={authStore.logout}>
          Logout <LogOut />
        </Button>
      </div>
    </RequireAuth>
  );
}
