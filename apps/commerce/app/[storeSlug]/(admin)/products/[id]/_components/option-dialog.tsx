"use client";

import { createOption, updateOption, type ProductOption } from "@/lib/commerce";
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
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  productId: string;
  editing?: ProductOption;
};

export function OptionDialog({ open, onClose, productId, editing }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  useEffect(() => {
    setName(editing?.name ?? "");
  }, [open, editing]);

  const mutation = useMutation({
    mutationFn: () =>
      editing ? updateOption(editing.id, { name }) : createOption(productId, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", productId] });
      toast.success(editing ? "Option updated" : "Option added");
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save option"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Option" : "Add Option"}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Label>Option name</Label>
          <Input
            className="mt-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Color, Size, Material"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && name.trim() && mutation.mutate()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name.trim()}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {editing ? "Save" : "Add Option"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
