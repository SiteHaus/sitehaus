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
import {
  RegisterInput,
  registerSchema,
} from "@site-haus/validation/forms/auth";
import { Eye, EyeClosed } from "lucide-react";
import { ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export interface RegisterFormProps {
  onSubmit: (values: RegisterInput) => Promise<void>;
  authForLabel: string;
  defaultValues?: Partial<RegisterInput>;
}

export const FormGroup = ({ children }: { children: ReactNode }) => {
  return <div className="flex flex-col md:flex-row gap-2">{children}</div>;
};

export const RegisterForm = ({
  onSubmit,
  authForLabel,
  defaultValues,
}: RegisterFormProps) => {
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      ...defaultValues,
    },
  });

  const [showPassword, setShowPassword] = useState(false);

  const submit = async (values: RegisterInput) => {
    try {
      await onSubmit(values);
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(getDisplayMessage(parsed));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto  p-8">
      <h2 className="text-2xl font-semibold text-center mb-6">
        Create an Account
      </h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <ClientReadOnlyField authForLabel={authForLabel || "SiteHaus"} />

          <Separator />

          <FormGroup>
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormGroup>

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
                    <InputGroupInput
                      type={showPassword ? "text" : "password"}
                      {...field}
                    />

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

          <Button type="submit" className="w-full mt-2">
            Sign Up
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{" "}
            <a
              href={`${process.env.NEXT_PUBLIC_WEB_URL ?? "https://sitehaus.dev"}/terms`}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href={`${process.env.NEXT_PUBLIC_WEB_URL ?? "https://sitehaus.dev"}/privacy`}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            .
          </p>

          <p className="text-sm text-center text-foreground">
            Already have an account?{" "}
            <AuthLink href="/login" className="text-blue-500 hover:underline">
              Log in
            </AuthLink>
          </p>
        </form>
      </Form>
    </div>
  );
};
