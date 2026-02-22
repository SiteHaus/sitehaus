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
import { InviteClientDialog } from "../../../../components/invite-client-dialog";
import type { ProjectItem } from "@site-haus/contracts";


export default function NewProjectPage() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const storeClients = useAuthStore((s) => s.clients);
  const loadMyClients = useAuthStore((s) => s.loadMyClients);
  const [loading, setLoading] = useState(false);
  const [createdProject, setCreatedProject] = useState<ProjectItem | null>(null);

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
        setCreatedProject(res.body.project);
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
    key: string,
  ): Promise<ClientOption | null> => {
    try {
      if (!key) {
        toast.error("Invalid client key.");
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
  if (!hasPerm("projects:manage")) return null;

  const inviteClientName = createdProject
    ? (storeClients.find((c) => c.id === createdProject.clientId)?.name ?? "Client")
    : "";

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
      {createdProject && (
        <InviteClientDialog
          open={!!createdProject}
          onOpenChange={(open) => {
            if (!open) router.push(`/projects/${createdProject.id}`);
          }}
          projectClientId={createdProject.clientId}
          clientName={inviteClientName}
          onDone={() => router.push(`/projects/${createdProject.id}`)}
        />
      )}
    </div>
  );
}
