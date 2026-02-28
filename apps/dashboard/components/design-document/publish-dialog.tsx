"use client";

import { Button } from "@site-haus/ui/components/base/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@site-haus/ui/components/base/dialog";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { BookOpen } from "lucide-react";
import { useState } from "react";

export function PublishDialog({
  onPublish,
}: {
  onPublish: (changeNote?: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePublish = async () => {
    setLoading(true);
    const success = await onPublish(changeNote.trim() || undefined);
    setLoading(false);
    if (success) {
      setChangeNote("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <BookOpen className="mr-2 h-3.5 w-3.5" />
          Publish Version
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish Version</DialogTitle>
          <DialogDescription>
            Save a snapshot of the current document as a new version. You can
            optionally add a note describing what changed.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="What changed in this version? (optional)"
          value={changeNote}
          onChange={(e) => setChangeNote(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={loading}>
            {loading ? "Publishing..." : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
