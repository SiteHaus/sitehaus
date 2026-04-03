"use client";

import { PasswordField } from "@/app/components/password-field";
import { SubmitButton } from "@/app/components/submit-button";
import { useApi } from "@/lib/typed-api";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@site-haus/ui/components/base/dialog";
import { Form } from "@site-haus/ui/components/base/form";
import { getDisplayMessage, parseApiError } from "@site-haus/ui/lib/api-error";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@site-haus/validation/forms/password";
import { Key } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function PasswordSection() {
  const api = useApi();
  const [open, setOpen] = useState(false);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  const onSubmit = async (values: ChangePasswordInput) => {
    try {
      const res = await api.password.change({ body: values });
      if (res.status === 204) {
        toast.success("Password changed successfully");
        setOpen(false);
        form.reset();
      } else {
        const parsed = parseApiError(res);
        toast.error(getDisplayMessage(parsed));
      }
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(getDisplayMessage(parsed));
    }
  };

  const handleClose = () => {
    setOpen(false);
    form.reset();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your password to keep your account secure.</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Key className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  Enter your current password and choose a new one.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <PasswordField
                    control={form.control}
                    name="currentPassword"
                    label="Current Password"
                    placeholder="Enter current password"
                  />
                  <PasswordField
                    control={form.control}
                    name="newPassword"
                    label="New Password"
                    placeholder="Enter new password"
                  />
                  <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center">
                    <Link
                      href="/request-password"
                      className="text-sm text-muted-foreground underline-offset-4 hover:underline sm:mr-auto"
                    >
                      Forgot password?
                    </Link>
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <SubmitButton
                      isSubmitting={form.formState.isSubmitting}
                      label="Change Password"
                      loadingLabel="Changing..."
                    />
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Use a strong password that you don&apos;t use anywhere else.
        </p>
      </CardContent>
    </Card>
  );
}
