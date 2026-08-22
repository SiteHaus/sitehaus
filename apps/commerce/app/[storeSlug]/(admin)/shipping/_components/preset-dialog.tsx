"use client";

import { createPreset } from "@/lib/commerce";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@site-haus/ui/components/base/dialog";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PresetDialog({ open, onClose }: Props) {
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [lengthIn, setLengthIn] = useState("");
  const [widthIn, setWidthIn] = useState("");
  const [heightIn, setHeightIn] = useState("");

  function reset() {
    setName("");
    setLengthIn("");
    setWidthIn("");
    setHeightIn("");
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      createPreset({
        name,
        lengthIn: parseInt(lengthIn, 10),
        widthIn: parseInt(widthIn, 10),
        heightIn: parseInt(heightIn, 10),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parcel-presets"] });
      toast.success("Box preset added");
      reset();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // parcel_presets.length_in/width_in/height_in are Postgres integer columns —
  // a decimal here passes this validation but throws on insert.
  const dims = [lengthIn, widthIn, heightIn];
  const canSave =
    name.trim().length > 0 && dims.every((d) => /^\d+$/.test(d) && parseInt(d, 10) > 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Box Preset</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="preset-name">Name</Label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Small box, Poly mailer"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Dimensions (inches)</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                min="0"
                step="1"
                value={lengthIn}
                onChange={(e) => setLengthIn(e.target.value)}
                placeholder="L"
                aria-label="Length"
              />
              <Input
                type="number"
                min="0"
                step="1"
                value={widthIn}
                onChange={(e) => setWidthIn(e.target.value)}
                placeholder="W"
                aria-label="Width"
              />
              <Input
                type="number"
                min="0"
                step="1"
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                placeholder="H"
                aria-label="Height"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
          >
            {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
