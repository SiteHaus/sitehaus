"use client";

import { getApi } from "@site-haus/stores/api";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Users } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";

export function TeamTab() {
  const { data: members, isLoading } = useQuery({
    queryKey: queryKeys.clients.members(),
    queryFn: async () => {
      const res = await getApi().clients.meMembers();
      if (res.status !== 200) throw new Error("Failed to load team");
      return res.body.members;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Team Members</CardTitle>
              <CardDescription className="mt-1">
                {members?.length ?? 0} {(members?.length ?? 0) === 1 ? "member" : "members"} on your
                workspace.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a
                href={process.env.NEXT_PUBLIC_IAM_URL ?? "http://localhost:3002"}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Manage in IAM
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!members?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-6">
              <Users className="mb-3 h-7 w-7 text-muted-foreground/40" />
              <p className="text-sm font-medium">No members found</p>
            </div>
          ) : (
            <div>
              {members.map((member, i) => {
                const initials =
                  `${member.firstName?.[0] ?? ""}${member.lastName?.[0] ?? ""}`.toUpperCase() ||
                  member.email[0]?.toUpperCase() ||
                  "?";
                const fullName =
                  `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || member.email;

                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i < members.length - 1 ? "border-b" : ""
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {member.roles.map((role: { id: string; name: string }) => (
                        <Badge key={role.id} variant="secondary" className="text-xs">
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        To add or remove team members, manage roles, or configure permissions, use the{" "}
        <a
          href={process.env.NEXT_PUBLIC_IAM_URL ?? "http://localhost:3002"}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          IAM portal
        </a>
        .
      </p>
    </div>
  );
}
