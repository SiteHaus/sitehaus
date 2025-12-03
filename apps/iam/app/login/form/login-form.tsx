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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@site-haus/ui/components/base/input-group";
import { Separator } from "@site-haus/ui/components/base/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@site-haus/ui/components/base/tooltip";
import { getDisplayMessage, parseApiError } from "@site-haus/ui/lib/api-error";
import { LoginInput, loginSchema } from "@site-haus/validation/forms/auth";
import { ExternalLink, HelpCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export interface LoginFormProps {
  onSubmit: (values: LoginInput) => Promise<void>;
  defaultValues?: Partial<LoginInput>;
  authForLabel?: string;
}

export const LoginForm = ({
  onSubmit,
  defaultValues,
  authForLabel,
}: LoginFormProps) => {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      ...defaultValues,
    },
  });

  const submit = async (values: LoginInput) => {
    try {
      await onSubmit(values);
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(getDisplayMessage(parsed));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8">
      <h1 className="text-2xl font-semibold text-center mb-2">Welcome</h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        Please log in to your account
      </p>

      <InputGroup>
        <InputGroupInput id="auth-for" value={authForLabel} readOnly />
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <InputGroupButton
                variant="ghost"
                aria-label="Help"
                size="icon-sm"
              >
                <HelpCircle />
              </InputGroupButton>
            </TooltipTrigger>
            <TooltipContent>
              This app requested you to sign in. We'll send you back after
              login.
            </TooltipContent>
          </Tooltip>
        </InputGroupAddon>
        <InputGroupAddon align="inline-start">
          <ExternalLink />
        </InputGroupAddon>
      </InputGroup>

      <Separator className="my-6" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
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
            {form.formState.isSubmitting ? "Submitting..." : "Log In"}
          </Button>

          <p className="text-sm text-center text-gray-500 mt-4">
            Forgot username or password?{" "}
            <AuthLink
              href="/request-password"
              add={{ mode: "reset" }}
              className="text-blue-500 hover:underline"
            >
              Reset Password
            </AuthLink>
          </p>

          <p className="text-sm text-center text-gray-500 mt-4">
            Don't have an account?{" "}
            <AuthLink
              href="/register"
              className="text-blue-500 hover:underline"
            >
              Sign up
            </AuthLink>
          </p>
        </form>
      </Form>
    </div>
  );
};
