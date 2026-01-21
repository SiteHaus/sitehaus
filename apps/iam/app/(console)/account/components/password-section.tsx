"use client";

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@site-haus/ui/components/base/form";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@site-haus/ui/components/base/input-group";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { getDisplayMessage, parseApiError } from "@site-haus/ui/lib/api-error";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@site-haus/validation/forms/password";
import { Eye, EyeClosed, Key } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function PasswordSection() {
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

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
    setShowCurrentPassword(false);
    setShowNewPassword(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Change your password to keep your account secure.
            </CardDescription>
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
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <InputGroup>
                            <InputGroupInput
                              type={showCurrentPassword ? "text" : "password"}
                              placeholder="Enter current password"
                              {...field}
                            />
                            <InputGroupAddon align="inline-end">
                              <InputGroupButton
                                type="button"
                                title={showCurrentPassword ? "Hide" : "Show"}
                                size="icon-xs"
                                onClick={() => setShowCurrentPassword((p) => !p)}
                              >
                                {showCurrentPassword ? <Eye /> : <EyeClosed />}
                              </InputGroupButton>
                            </InputGroupAddon>
                          </InputGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <InputGroup>
                            <InputGroupInput
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Enter new password"
                              {...field}
                            />
                            <InputGroupAddon align="inline-end">
                              <InputGroupButton
                                type="button"
                                title={showNewPassword ? "Hide" : "Show"}
                                size="icon-xs"
                                onClick={() => setShowNewPassword((p) => !p)}
                              >
                                {showNewPassword ? <Eye /> : <EyeClosed />}
                              </InputGroupButton>
                            </InputGroupAddon>
                          </InputGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          Changing...
                        </>
                      ) : (
                        "Change Password"
                      )}
                    </Button>
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
