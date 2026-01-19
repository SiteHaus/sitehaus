"use client";

import { RequireAuth } from "@/lib/require-auth";
import { useApi } from "@/lib/typed-api";
import { SessionItem } from "@site-haus/contracts";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@site-haus/ui/components/base/dialog";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { formatDistanceToNow } from "date-fns";
import {
  Chrome,
  Globe,
  LogOut,
  Monitor,
  Smartphone,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

function getBrowserIcon(browser: string | null | undefined) {
  if (!browser) return Globe;
  const lower = browser.toLowerCase();
  if (lower.includes("chrome")) return Chrome;
  if (lower.includes("mobile") || lower.includes("android") || lower.includes("ios"))
    return Smartphone;
  return Monitor;
}

function getDeviceLabel(session: SessionItem): string {
  const device = session.device;
  if (!device) return "Unknown Device";

  const parts: string[] = [];
  if (device.browser) parts.push(device.browser);
  if (device.platform) parts.push(`on ${device.platform}`);

  return parts.length > 0 ? parts.join(" ") : "Unknown Device";
}

export default function MySessionsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <Spinner className="size-6" />
        </div>
      }
    >
      <MySessionsContent />
    </Suspense>
  );
}

function MySessionsContent() {
  const api = useApi();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setSessions([]);
    const res = await api.sessions.list();
    if (res.status === 200) {
      setSessions(res.body.sessions);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    if (!accessToken) return;
    fetchSessions();
  }, [accessToken, fetchSessions]);

  const handleRevokeOne = async (sessionId: string) => {
    setRevokingId(sessionId);
    const res = await api.sessions.revokeOne({
      params: { sessionId },
      body: undefined,
    });
    if (res.status === 204) {
      toast.success("Session revoked");
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } else {
      toast.error("Failed to revoke session");
    }
    setRevokingId(null);
  };

  const handleRevokeAll = async () => {
    setRevokingAll(true);
    const res = await api.sessions.revokeOthers({ body: undefined });
    if (res.status === 204) {
      toast.success("All other sessions have been revoked");
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      setRevokeAllOpen(false);
    } else {
      toast.error("Failed to revoke sessions");
    }
    setRevokingAll(false);
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <RequireAuth>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Sessions</h1>
            <p className="text-muted-foreground">
              Manage your active sessions and devices.
            </p>
          </div>
          {otherSessionsCount > 0 && (
            <Dialog open={revokeAllOpen} onOpenChange={setRevokeAllOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out other devices
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sign out other devices?</DialogTitle>
                  <DialogDescription>
                    This will revoke {otherSessionsCount} other{" "}
                    {otherSessionsCount === 1 ? "session" : "sessions"}. You will
                    remain signed in on this device.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setRevokeAllOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRevokeAll}
                    disabled={revokingAll}
                  >
                    {revokingAll ? (
                      <Spinner className="mr-2 h-4 w-4" />
                    ) : (
                      <LogOut className="mr-2 h-4 w-4" />
                    )}
                    Sign out all
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No active sessions found.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => {
              const BrowserIcon = getBrowserIcon(session.device?.browser);
              const isRevoking = revokingId === session.id;

              return (
                <Card key={session.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-muted p-2">
                          <BrowserIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {getDeviceLabel(session)}
                          </CardTitle>
                          {session.device?.platform && (
                            <p className="text-sm text-muted-foreground">
                              {session.device.platform}
                            </p>
                          )}
                        </div>
                      </div>
                      {session.isCurrent && (
                        <Badge variant="success">Current</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        Last active{" "}
                        {formatDistanceToNow(new Date(session.lastUsedAt), {
                          addSuffix: true,
                        })}
                      </p>
                      <p>
                        Created{" "}
                        {formatDistanceToNow(new Date(session.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </CardContent>
                  {!session.isCurrent && (
                    <CardFooter className="pt-0">
                      <RevokeSessionDialog
                        sessionLabel={getDeviceLabel(session)}
                        onConfirm={() => handleRevokeOne(session.id)}
                        isRevoking={isRevoking}
                      />
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}

function RevokeSessionDialog({
  sessionLabel,
  onConfirm,
  isRevoking,
}: {
  sessionLabel: string;
  onConfirm: () => void;
  isRevoking: boolean;
}) {
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    await onConfirm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Revoke
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke this session?</DialogTitle>
          <DialogDescription>
            This will sign out the session on{" "}
            <span className="font-medium">{sessionLabel}</span>. The device will
            need to sign in again to access this account.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isRevoking}
          >
            {isRevoking ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Revoke session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
