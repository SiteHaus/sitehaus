"use client";

import { getApi } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { CreateTicketForm } from "@site-haus/ui/components/forms/create-ticket-form";
import { PageHero } from "@site-haus/ui/components/shared/page-hero";
import { type CreateTicketInput } from "@site-haus/validation/forms/ticket";
import { TicketPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
        router.back();
      } else {
        const msg =
          res.status === 400 ? "Validation error. Check your inputs." : "Failed to create ticket.";
        toast.error(msg);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="space-y-6">
      <PageHero
        icon={TicketPlus}
        title="New Ticket"
        subtitle="Create a new ticket for a project."
      />
      <CreateTicketForm projects={projectOptions} onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
