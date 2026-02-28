"use client";

import type { MilestoneItem } from "@site-haus/contracts";
import { Button } from "@site-haus/ui/components/base/button";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@site-haus/ui/components/base/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@site-haus/ui/components/base/sheet";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { useEffect, useState } from "react";

interface MilestoneFormSheetProps {
  open: boolean;
  onClose: () => void;
  milestone?: MilestoneItem | null;
  onSave: (data: {
    name: string;
    description?: string | null;
    status?: MilestoneItem["status"];
    dueDate?: string | null;
  }) => Promise<boolean>;
}

export function MilestoneFormSheet({
  open,
  onClose,
  milestone,
  onSave,
}: MilestoneFormSheetProps) {
  const isEdit = !!milestone;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<MilestoneItem["status"]>("not_started");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(milestone?.name ?? "");
      setDescription(milestone?.description ?? "");
      setStatus(milestone?.status ?? "not_started");
      setDueDate(
        milestone?.dueDate ? milestone.dueDate.slice(0, 10) : ""
      );
    }
  }, [open, milestone]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const ok = await onSave({
      name: name.trim(),
      description: description.trim() || null,
      ...(isEdit ? { status } : {}),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Edit Milestone" : "New Milestone"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update this milestone's details."
              : "Add a new milestone to this project."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ms-name">Name</Label>
            <Input
              id="ms-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design Approved"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ms-description">Description</Label>
            <Textarea
              id="ms-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="resize-none"
            />
          </div>

          {isEdit && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus(v as MilestoneItem["status"])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ms-due">Due Date</Label>
            <Input
              id="ms-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving && <Spinner className="size-4 mr-2" />}
            {isEdit ? "Save Changes" : "Create Milestone"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
