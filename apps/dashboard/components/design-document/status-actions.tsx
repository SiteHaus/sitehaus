"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@site-haus/ui/components/base/alert-dialog";
import { Button } from "@site-haus/ui/components/base/button";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { ArrowRight, Check, Pencil, Send, Undo } from "lucide-react";
import { useState } from "react";

type Status = "draft" | "in_review" | "approved" | "amended";

function ConfirmAction({
  trigger,
  title,
  description,
  actionLabel,
  variant = "default",
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  variant?: "default" | "destructive";
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            disabled={loading}
            onClick={async (e) => {
              e.preventDefault();
              setLoading(true);
              await onConfirm();
              setLoading(false);
              setOpen(false);
            }}
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function StatusActions({
  status,
  onTransition,
}: {
  status: Status;
  onTransition: (status: Status) => Promise<boolean>;
}) {
  const isEmployee = useAuthStore((s) => s.hasPerm("documents:manage"));

  if (isEmployee) {
    return <EmployeeActions status={status} onTransition={onTransition} />;
  }

  // Client actions — only during in_review
  if (status !== "in_review") return null;

  return (
    <div className="flex items-center gap-2">
      <ConfirmAction
        trigger={
          <Button size="sm" variant="default">
            <Check className="mr-2 h-3.5 w-3.5" />
            Approve
          </Button>
        }
        title="Approve Design Document"
        description="This will approve the design document. You can still request changes later if needed."
        actionLabel="Approve"
        onConfirm={() => onTransition("approved").then(() => {})}
      />
      <ConfirmAction
        trigger={
          <Button size="sm" variant="outline">
            <Undo className="mr-2 h-3.5 w-3.5" />
            Request Changes
          </Button>
        }
        title="Request Changes"
        description="This will send the document back to draft so the team can make changes."
        actionLabel="Request Changes"
        onConfirm={() => onTransition("draft").then(() => {})}
      />
    </div>
  );
}

function EmployeeActions({
  status,
  onTransition,
}: {
  status: Status;
  onTransition: (status: Status) => Promise<boolean>;
}) {
  switch (status) {
    case "draft":
      return (
        <ConfirmAction
          trigger={
            <Button size="sm">
              <Send className="mr-2 h-3.5 w-3.5" />
              Submit for Review
            </Button>
          }
          title="Submit for Review"
          description="The client will be able to review and approve or request changes to this design document."
          actionLabel="Submit"
          onConfirm={() => onTransition("in_review").then(() => {})}
        />
      );

    case "in_review":
      return (
        <ConfirmAction
          trigger={
            <Button size="sm" variant="outline">
              <Undo className="mr-2 h-3.5 w-3.5" />
              Return to Draft
            </Button>
          }
          title="Return to Draft"
          description="This will pull the document back to draft status for further editing."
          actionLabel="Return to Draft"
          onConfirm={() => onTransition("draft").then(() => {})}
        />
      );

    case "approved":
      return (
        <ConfirmAction
          trigger={
            <Button size="sm" variant="outline">
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Amend
            </Button>
          }
          title="Amend Design Document"
          description="This will create an amended version of the document for further changes. The client will need to re-approve."
          actionLabel="Amend"
          onConfirm={() => onTransition("amended").then(() => {})}
        />
      );

    case "amended":
      return (
        <ConfirmAction
          trigger={
            <Button size="sm">
              <ArrowRight className="mr-2 h-3.5 w-3.5" />
              Submit for Review
            </Button>
          }
          title="Submit for Review"
          description="The client will be able to review the amended document."
          actionLabel="Submit"
          onConfirm={() => onTransition("in_review").then(() => {})}
        />
      );

    default:
      return null;
  }
}
