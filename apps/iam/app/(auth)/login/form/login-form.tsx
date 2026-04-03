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
import { ClientReadOnlyField } from "@site-haus/ui/components/shared/client-readonly-field";
import { getDisplayMessage, parseApiError } from "@site-haus/ui/lib/api-error";
import { LoginInput, loginSchema } from "@site-haus/validation/forms/auth";
import { Eye, EyeClosed } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export interface LoginFormProps {
  onSubmit: (values: LoginInput) => Promise<void>;
  defaultValues?: Partial<LoginInput>;
  authForLabel?: string;
}

export const LoginForm = ({ onSubmit, defaultValues, authForLabel }: LoginFormProps) => {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      ...defaultValues,
    },
  });

  const [showPassword, setShowPassword] = useState(false);

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
      <p className="text-sm text-gray-500 text-center mb-6">Please log in to your account</p>

      <ClientReadOnlyField authForLabel={authForLabel || "SiteHaus"} />

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
                  <InputGroup>
                    <InputGroupInput type={showPassword ? "text" : "password"} {...field} />

                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        title={showPassword ? "Hide password" : "Show password"}
                        size="icon-xs"
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? <Eye /> : <EyeClosed />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
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
            Don&apos;t have an account?{" "}
            <AuthLink href="/register" className="text-blue-500 hover:underline">
              Sign up
            </AuthLink>
          </p>
        </form>
      </Form>
    </div>
  );
};
