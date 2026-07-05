"use client";

import { Button } from "@site-haus/ui/components/base/button";
import { Checkbox } from "@site-haus/ui/components/base/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@site-haus/ui/components/base/dialog";
import { Copy, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  secret: string;
  onClose: () => void;
};

export function SecretDialog({ open, secret, onClose }: Props) {
  const [acknowledged, setAcknowledged] = useState(false);

  function copySecret() {
    navigator.clipboard.writeText(secret).then(() => toast.success("Secret copied"));
  }

  function handleClose() {
    setAcknowledged(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-green-500" />
            Save your signing secret
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            This secret is used to verify that webhook deliveries come from SiteHaus. It will{" "}
            <span className="font-semibold text-foreground">not be shown again</span> — copy it now
            and store it securely.
          </p>

          <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2.5">
            <code className="flex-1 text-xs font-mono break-all select-all">{secret}</code>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={copySecret}>
              <Copy className="size-4" />
            </Button>
          </div>

          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="secret-ack"
              checked={acknowledged}
              onCheckedChange={(v) => setAcknowledged(!!v)}
            />
            <label htmlFor="secret-ack" className="text-sm cursor-pointer leading-snug">
              I've copied and saved this secret in a secure location.
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} disabled={!acknowledged}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
