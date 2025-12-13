"use client";

import { AuthLink } from "@/lib/auth-nav";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Form,
  FormControl,
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
  RequestInput,
  requestPasswordResetSchema,
} from "@site-haus/validation/forms/password";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export interface RequestPasswordResetProps {
  onSubmit: (values: RequestInput) => Promise<void>;
  defaultValues?: Partial<RequestInput>;
  authForLabel?: string;
}

export const RequestPasswordResetForm = ({
  onSubmit,
  defaultValues,
  authForLabel,
}: RequestPasswordResetProps) => {
  const form = useForm<RequestInput>({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: {
      email: "",
      ...defaultValues,
    },
  });

  const submit = async (values: RequestInput) => {
    try {
      await onSubmit(values);
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(getDisplayMessage(parsed));
    } finally {
      toast.info("If that email exists, we sent a reset code.");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8">
      <div className="flex items-center mb-4">
        <AuthLink
          href="/"
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Login
        </AuthLink>
      </div>

      <h2 className="text-2xl font-semibold text-center mb-2">
        Request Password Reset
      </h2>
      <p className="text-sm text-gray-500 text-center mb-6">
        Enter your email and we&lsquo;ll send you a link to reset your password.
      </p>

      <ClientReadOnlyField authForLabel={authForLabel || "SiteHaus"} />

      <Separator className="my-6" />

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="you@example.com"
                    type="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Sending..." : "Request Password"}
          </Button>
        </form>
      </Form>
    </div>
  );
};
