"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@site-haus/ui/components/base/form";
import { Input } from "@site-haus/ui/components/base/input";
import { Separator } from "@site-haus/ui/components/base/separator";
import { ClientReadOnlyField } from "@site-haus/ui/components/shared/client-readonly-field";
import { getDisplayMessage, parseApiError } from "@site-haus/ui/lib/api-error";
import {
  type Verify2faLoginInput,
  verify2faLoginSchema,
} from "@site-haus/validation/forms/auth";
import { ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export interface TwoFactorVerifyFormProps {
  onSubmit: (values: Verify2faLoginInput) => Promise<void>;
  onCancel: () => void;
  authForLabel: string;
}

export const TwoFactorVerifyForm = ({
  onSubmit,
  onCancel,
  authForLabel,
}: TwoFactorVerifyFormProps) => {
  const form = useForm<Verify2faLoginInput>({
    resolver: zodResolver(verify2faLoginSchema),
    defaultValues: {
      code: "",
    },
  });

  const submitting = form.formState.isSubmitting;

  const submit = async (values: Verify2faLoginInput) => {
    try {
      await onSubmit(values);
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(getDisplayMessage(parsed));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8">
      <h1 className="text-2xl font-semibold">Two-Factor Authentication</h1>
      <p className="text-muted-foreground mb-2 text-sm">
        Enter the 6-digit code from your authenticator app, or use a backup
        code.
      </p>

      <ClientReadOnlyField authForLabel={authForLabel} />

      <Separator className="my-4" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Authentication Code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="000000"
                    maxLength={12}
                    autoComplete="one-time-code"
                    {...field}
                    className="text-center text-lg tracking-widest"
                  />
                </FormControl>
                <FormDescription>
                  Enter your 6-digit code or 12-character backup code.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? (
                "Verifying..."
              ) : (
                <>
                  Verify <ShieldCheck className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
