"use client";

import { PasswordField } from "@/app/components/password-field";
import { SubmitButton } from "@/app/components/submit-button";
import { useApi } from "@/lib/typed-api";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@site-haus/ui/components/base/badge";
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
} from "@site-haus/ui/components/base/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@site-haus/ui/components/base/form";
import { Input } from "@site-haus/ui/components/base/input";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import { getDisplayMessage, parseApiError } from "@site-haus/ui/lib/api-error";
import {
  disable2faSchema,
  enable2faSchema,
  type Disable2faInput,
  type Enable2faInput,
} from "@site-haus/validation/forms/account";
import { Shield, ShieldOff } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface TotpStatus {
  enabled: boolean;
  enabledAt: string | null;
}

interface SetupData {
  secret: string;
  qrCodeDataUrl: string;
  otpauthUrl: string;
}

export function TotpSection() {
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<TotpStatus | null>(null);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [enableDialogOpen, setEnableDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.auth.account.get2faStatus();
      if (res.status === 200) {
        setStatus(res.body);
      }
    } catch (err) {
      console.error("Failed to fetch 2FA status:", err);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleStartSetup = async () => {
    try {
      const res = await api.auth.account.setup2fa();
      if (res.status === 200) {
        setSetupData(res.body);
        setEnableDialogOpen(true);
      } else {
        const parsed = parseApiError(res);
        toast.error(getDisplayMessage(parsed));
      }
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(getDisplayMessage(parsed));
    }
  };

  const handleEnableSuccess = (codes: string[]) => {
    setBackupCodes(codes);
    setSetupData(null);
    setStatus({ enabled: true, enabledAt: new Date().toISOString() });
  };

  const handleDisableSuccess = () => {
    setStatus({ enabled: false, enabledAt: null });
    setDisableDialogOpen(false);
    toast.success("Two-factor authentication disabled");
  };

  const handleCloseBackupCodes = () => {
    setBackupCodes(null);
    setEnableDialogOpen(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <Spinner className="h-6 w-6" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Two-Factor Authentication
                {status?.enabled ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="secondary">Disabled</Badge>
                )}
              </CardTitle>
              <CardDescription>Add an extra layer of security to your account.</CardDescription>
            </div>
            {status?.enabled ? (
              <Button variant="outline" size="sm" onClick={() => setDisableDialogOpen(true)}>
                <ShieldOff className="mr-2 h-4 w-4" />
                Disable
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleStartSetup}>
                <Shield className="mr-2 h-4 w-4" />
                Enable 2FA
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {status?.enabled ? (
            <p className="text-sm text-muted-foreground">
              Your account is protected with two-factor authentication using an authenticator app.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Protect your account by requiring a code from your authenticator app when you sign in.
            </p>
          )}
        </CardContent>
      </Card>

      <EnableTotpDialog
        open={enableDialogOpen && !backupCodes}
        onOpenChange={setEnableDialogOpen}
        setupData={setupData}
        onSuccess={handleEnableSuccess}
      />

      <BackupCodesDialog
        open={!!backupCodes}
        onClose={handleCloseBackupCodes}
        codes={backupCodes ?? []}
      />

      <DisableTotpDialog
        open={disableDialogOpen}
        onOpenChange={setDisableDialogOpen}
        onSuccess={handleDisableSuccess}
      />
    </>
  );
}

function EnableTotpDialog({
  open,
  onOpenChange,
  setupData,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setupData: SetupData | null;
  onSuccess: (backupCodes: string[]) => void;
}) {
  const api = useApi();
  const form = useForm<Enable2faInput>({
    resolver: zodResolver(enable2faSchema),
    defaultValues: { code: "", secret: setupData?.secret ?? "" },
  });

  useEffect(() => {
    if (setupData?.secret) {
      form.setValue("secret", setupData.secret);
    }
  }, [setupData?.secret, form]);

  const onSubmit = async (values: Enable2faInput) => {
    try {
      const res = await api.auth.account.enable2fa({ body: values });
      if (res.status === 200) {
        onSuccess(res.body.backupCodes);
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
    onOpenChange(false);
    form.reset();
  };

  if (!setupData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            Scan the QR code with your authenticator app, then enter the code to verify.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center py-4">
          <div className="bg-white p-4 rounded-lg">
            <Image src={setupData.qrCodeDataUrl} alt="2FA QR Code" width={200} height={200} />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Or enter manually: <code className="break-all">{setupData.secret}</code>
          </p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="000000"
                      maxLength={6}
                      {...field}
                      className="text-center text-lg tracking-widest"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <SubmitButton
                isSubmitting={form.formState.isSubmitting}
                label="Enable 2FA"
                loadingLabel="Verifying..."
              />
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function BackupCodesDialog({
  open,
  onClose,
  codes,
}: {
  open: boolean;
  onClose: () => void;
  codes: string[];
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(codes.join("\n"));
    toast.success("Backup codes copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Your Backup Codes</DialogTitle>
          <DialogDescription>
            Store these codes in a safe place. You can use them to access your account if you lose
            your authenticator device.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted p-4 rounded-lg font-mono text-sm grid grid-cols-2 gap-2">
          {codes.map((code, i) => (
            <div key={i} className="text-center">
              {code}
            </div>
          ))}
        </div>
        <p className="text-sm text-destructive">
          Each code can only be used once. Keep them safe and secure.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={handleCopy}>
            Copy Codes
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DisableTotpDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const api = useApi();

  const form = useForm<Disable2faInput>({
    resolver: zodResolver(disable2faSchema),
    defaultValues: { password: "" },
  });

  const onSubmit = async (values: Disable2faInput) => {
    try {
      const res = await api.auth.account.disable2fa({ body: values });
      if (res.status === 204) {
        onSuccess();
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
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            Enter your password to disable two-factor authentication. This will make your account
            less secure.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <PasswordField
              control={form.control}
              name="password"
              label="Password"
              placeholder="Enter your password"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <SubmitButton
                isSubmitting={form.formState.isSubmitting}
                label="Disable 2FA"
                loadingLabel="Disabling..."
                variant="destructive"
              />
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
