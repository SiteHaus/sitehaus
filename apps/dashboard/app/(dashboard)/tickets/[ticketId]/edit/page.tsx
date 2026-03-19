"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TicketItem, type ProjectItem } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Button } from "@site-haus/ui/components/base/button";
import { Calendar } from "@site-haus/ui/components/base/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSection,
} from "@site-haus/ui/components/base/form";
import { Input } from "@site-haus/ui/components/base/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@site-haus/ui/components/base/popover";
import { Separator } from "@site-haus/ui/components/base/separator";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { ComboBoxField } from "@site-haus/ui/components/shared/combobox-field";
import { cn } from "@site-haus/ui/lib/utils";
import { label } from "@site-haus/utils/core/format";
import {
  ticketStatusEnum,
  ticketPriorityEnum,
  ticketTypeEnum,
  type UpdateTicketInput,
  updateTicketSchema,
} from "@site-haus/validation/forms/ticket";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SubmitTicketForm } from "../../_components/SubmitTicketForm";

const typeOptions = ticketTypeEnum.options.map((v) => ({
  label: v.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
  value: v,
}));
const priorityOptions = ticketPriorityEnum.options.map((v) => ({
  label: v.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
  value: v,
}));
const statusOptions = ticketStatusEnum.options.map((v) => ({
  label: v.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
  value: v,
}));

export default function EditProjectPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const router = useRouter();
  const canManage = useAuthStore((s) => s.hasPerm("tickets:manage"));
  const [ticket, setTicket] = useState<TicketItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<UpdateTicketInput>({
    resolver: zodResolver(updateTicketSchema),
  });

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApi().tickets.get({ params: { ticketId } });
      if (res.status === 200) {
        const t = res.body.ticket;
        setTicket(t);
        form.reset({
          title: t.title,
          description: t.description ?? undefined,
          type: t.type,
          priority: t.priority ?? undefined,
        });
      } else {
        setTicket(null);
      }
    } catch {
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId, form]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const onSubmit = async (values: UpdateTicketInput) => {
    setSaving(true);
    try {
      const res = await getApi().tickets.update({
        params: { ticketId },
        body: values,
      });
      if (res.status === 200) {
        toast.success("Ticket updated");
        router.push(`/tickets/${ticketId}`);
      } else {
        toast.error("Failed to update ticket");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    router.replace(`/tickets/${ticketId}`);
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-lg font-medium">Ticket not found</h3>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/tickets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tickets
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-6 space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href={`/tickets/${ticketId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Ticket
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit {ticket.title}</h1>
        <p className="text-muted-foreground mt-1 mb-4">
          Update ticket details below.
        </p>
        <SubmitTicketForm
          ticketId={ticketId}
          defaultValues={{
            title: ticket.title,
            description: ticket.description ?? undefined,
            type: ticket.type,
            priority: ticket.priority ?? undefined,
          }}
        />
      </div>
    </div>
  );
}
