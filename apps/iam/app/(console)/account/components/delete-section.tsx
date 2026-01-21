"use client";

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
  FormDescription,
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
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { getDisplayMessage, parseApiError } from "@site-haus/ui/lib/api-error";
import {
  deleteAccountSchema,
  type DeleteAccountInput,
} from "@site-haus/validation/forms/account";
import { AlertTriangle, Eye, EyeClosed, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function DeleteSection() {
  const api = useApi();
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<DeleteAccountInput>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: {
      password: "",
      confirmation: "",
    },
  });

  const onSubmit = async (values: DeleteAccountInput) => {
    try {
      const res = await api.auth.account.deleteAccount({ body: values });
      if (res.status === 204) {
        clearAuth();
        toast.success("Account deleted successfully");
        router.push("/login");
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
    setShowPassword(false);
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-destructive/10 p-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Once you delete your account, there is no going back. This action
          cannot be undone.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">
                Delete Your Account
              </DialogTitle>
              <DialogDescription>
                This action is permanent and cannot be undone. All your data
                will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            placeholder="Enter your password"
                            {...field}
                          />
                          <InputGroupAddon align="inline-end">
                            <InputGroupButton
                              type="button"
                              title={showPassword ? "Hide" : "Show"}
                              size="icon-xs"
                              onClick={() => setShowPassword((p) => !p)}
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
                <FormField
                  control={form.control}
                  name="confirmation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmation</FormLabel>
                      <FormControl>
                        <Input placeholder='Type "DELETE" to confirm' {...field} />
                      </FormControl>
                      <FormDescription>
                        Type <strong>DELETE</strong> to confirm account deletion.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Account
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
