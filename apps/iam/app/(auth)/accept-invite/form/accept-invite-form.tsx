"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@site-haus/ui/components/base/badge";
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
import { getDisplayMessage, parseApiError } from "@site-haus/ui/lib/api-error";
import {
  AcceptInviteInput,
  acceptInviteExistingUserSchema,
  acceptInviteNewUserSchema,
} from "@site-haus/validation/forms/invite";
import { Eye, EyeClosed } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export interface AcceptInviteFormProps {
  onSubmit: (values: AcceptInviteInput) => Promise<void>;
  defaultValues: {
    clientId: string;
    email: string;
    code: string;
  };
  userExists: boolean;
  clientName: string;
  roles: string[];
}

const FormGroup = ({ children }: { children: React.ReactNode }) => {
  return <div className="flex flex-col md:flex-row gap-2">{children}</div>;
};

export const AcceptInviteForm = ({
  onSubmit,
  defaultValues,
  userExists,
  clientName,
  roles,
}: AcceptInviteFormProps) => {
  // Use different schema based on whether user exists
  const schema = userExists ? acceptInviteExistingUserSchema : acceptInviteNewUserSchema;

  const form = useForm<AcceptInviteInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: defaultValues.clientId,
      email: defaultValues.email,
      code: defaultValues.code,
      // Only set these for new users
      ...(userExists ? {} : { firstName: "", lastName: "", password: "" }),
    },
  });

  const [showPassword, setShowPassword] = useState(false);

  const submit = async (values: AcceptInviteInput) => {
    try {
      await onSubmit(values);
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(getDisplayMessage(parsed));
    }
  };

  const title = userExists ? `Join ${clientName || "Team"}` : "Accept Invitation";

  const subtitle = userExists
    ? "Click below to join the team with your existing account."
    : "Complete your account setup to join the team.";

  const buttonText = userExists ? `Join ${clientName || "Team"}` : "Create Account & Join";

  return (
    <div className="w-full max-w-md mx-auto p-8">
      <h2 className="text-2xl font-semibold text-center mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground text-center mb-6">{subtitle}</p>

      {/* Show roles being assigned */}
      {roles.length > 0 && (
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">You will be assigned:</p>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          {/* Email field - always shown but disabled */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} disabled className="bg-muted" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Only show name/password fields for new users */}
          {!userExists && (
            <>
              <Separator />

              <FormGroup>
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>

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
                          placeholder="Create a password"
                          {...field}
                          value={field.value ?? ""}
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
            </>
          )}

          <Button type="submit" className="w-full mt-2" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Joining..." : buttonText}
          </Button>
        </form>
      </Form>
    </div>
  );
};
