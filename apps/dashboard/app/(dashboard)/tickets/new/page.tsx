"use client";

import { getApi } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { CreateTicketForm } from "@site-haus/ui/components/forms/create-ticket-form";
import { type CreateTicketInput } from "@site-haus/validation/forms/ticket";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function NewTicketsPage() {
  const session = useAuthStore((s) => s.session);
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const [loading, setLoading] = useState(false);
  const storeProjects = useAuthStore((s) => s.projects);
  const loadMyProjects = useAuthStore((s) => s.loadMyProjects);
  const router = useRouter();

  // Load projects on mount if not already loaded
  useEffect(() => {
    if (storeProjects.length === 0) {
      loadMyProjects();
    }
  }, []);

  const projectOptions = useMemo(
    () => storeProjects.map((p) => ({ id: p.id, name: p.name })),
    [storeProjects],
  );

  const handleSubmit = async (values: CreateTicketInput) => {
    setLoading(true);
    try {
      const res = await getApi().tickets.create({ body: values });
      if (res.status === 201) {
        toast.success("Ticket created successfully");
      } else {
        const msg =
          res.status === 400
            ? "Validation error. Check your inputs."
            : "Failed to create ticket.";
        toast.error(msg);
      }
      router.back();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;
  if (!hasPerm("tickets:manage")) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Ticket</h1>
        <p className="text-muted-foreground mt-1">
          Create a new ticket for a project.
        </p>
      </div>
      <CreateTicketForm
        projects={projectOptions}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </div>
  );
}
