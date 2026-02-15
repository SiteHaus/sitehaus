"use client";

import { getApi } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import {
  CreateProjectForm,
  type ClientOption,
} from "@site-haus/ui/components/forms/create-project-form";
import { type CreateProjectInput } from "@site-haus/validation/forms/project";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function NewProjectPage() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const storeClients = useAuthStore((s) => s.clients);
  const loadMyClients = useAuthStore((s) => s.loadMyClients);
  const [loading, setLoading] = useState(false);

  const clientOptions: ClientOption[] = useMemo(
    () =>
      storeClients
        .filter((c) => !c.hidden)
        .map((c) => ({ id: c.id, name: c.name })),
    [storeClients],
  );

  const handleSubmit = async (values: CreateProjectInput) => {
    setLoading(true);
    try {
      const res = await getApi().projects.create({ body: values });
      if (res.status === 201) {
        toast.success("Project created successfully");
        router.push(`/projects/${res.body.project.id}`);
      } else {
        const msg =
          res.status === 400
            ? "Validation error. Check your inputs."
            : "Failed to create project.";
        toast.error(msg);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (
    name: string,
  ): Promise<ClientOption | null> => {
    try {
      const key = slugify(name);
      if (!key) {
        toast.error("Invalid client name.");
        return null;
      }

      const res = await getApi().clients.create({
        body: {
          key,
          name,
          audience: `https://${key}.sitehaus.dev`,
        },
      });

      if (res.status === 201) {
        toast.success(`Client "${name}" created`);
        await loadMyClients();
        return { id: res.body.client.id, name: res.body.client.name };
      }

      if (res.status === 409) {
        toast.error("A client with that name already exists.");
      } else {
        toast.error("Failed to create client.");
      }
      return null;
    } catch {
      toast.error("Something went wrong creating the client.");
      return null;
    }
  };

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Project</h1>
        <p className="text-muted-foreground mt-1">
          Create a new web project for a client.
        </p>
      </div>
      <CreateProjectForm
        clients={clientOptions}
        onSubmit={handleSubmit}
        onCreateClient={handleCreateClient}
        loading={loading}
      />
    </div>
  );
}
