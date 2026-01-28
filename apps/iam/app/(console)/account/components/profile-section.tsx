"use client";

import { SubmitButton } from "@/app/components/submit-button";
import { useApi } from "@/lib/typed-api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@site-haus/stores/auth-store";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@site-haus/ui/components/base/form";
import { Input } from "@site-haus/ui/components/base/input";
import { getDisplayMessage, parseApiError } from "@site-haus/ui/lib/api-error";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@site-haus/validation/forms/account";
import { Pencil, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function ProfileSection() {
  const api = useApi();
  const user = useAuthStore((s) => s.user);
  const setMe = useAuthStore((s) => s.setMe);
  const [editing, setEditing] = useState(false);

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
    },
  });

  const onSubmit = async (values: UpdateProfileInput) => {
    try {
      const res = await api.auth.account.updateProfile({ body: values });
      if (res.status === 200) {
        setMe({ user: res.body, session: useAuthStore.getState().session });
        toast.success("Profile updated");
        setEditing(false);
      } else {
        const parsed = parseApiError(res);
        toast.error(getDisplayMessage(parsed));
      }
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(getDisplayMessage(parsed));
    }
  };

  const handleCancel = () => {
    form.reset({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
    });
    setEditing(false);
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Your personal details used across SiteHaus.
            </CardDescription>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
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
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex gap-2">
                <SubmitButton
                  isSubmitting={form.formState.isSubmitting}
                  label="Save Changes"
                  loadingLabel="Saving..."
                />
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                First Name
              </dt>
              <dd className="text-sm">{user.firstName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Last Name
              </dt>
              <dd className="text-sm">{user.lastName}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">
                Email
              </dt>
              <dd className="text-sm">{user.email}</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
