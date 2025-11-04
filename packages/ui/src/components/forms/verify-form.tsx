"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@site-haus/ui/components/base/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@site-haus/ui/components/base/input-otp";
import { Separator } from "@site-haus/ui/components/base/separator";
import { maskEmail } from "@site-haus/utils/core/helpers";
import { VerifyInput, verifySchema } from "@site-haus/validation/forms/auth";
import { BadgeCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { getDisplayMessage, parseApiError } from "src/lib/api-error.js";

export interface VerifyCodeFormProps {
  onSubmit: (values: VerifyInput) => Promise<void>;
  defaultValues?: Partial<VerifyInput>;
  next: string;
  requestCode: () => Promise<void>;
  resending: boolean;
  cooldown: number;
}

export const VerifyCodeForm = ({
  onSubmit,
  defaultValues,
  requestCode,
  resending,
  cooldown,
}: VerifyCodeFormProps) => {
  const form = useForm<VerifyInput>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      code: "",
      ...defaultValues,
    },
  });

  const submit = async (values: VerifyInput) => {
    try {
      await onSubmit(values);
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(getDisplayMessage(parsed));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto  p-8">
      <h1 className="text-2xl font-semibold">Verify Your Account</h1>

      <p className="text-muted-foreground mb-2 text-sm">
        Didn't receive a code?{" "}
        <Button
          variant="link"
          onClick={requestCode}
          className="px-0 text-blue-500"
          disabled={resending || cooldown > 0}
        >
          Resend OTP
        </Button>
      </p>

      <Separator className="my-4" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>One-Time Password</FormLabel>
                <FormControl>
                  <InputOTP maxLength={6} {...field}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormDescription>
                  We sent a code to{" "}
                  {`${maskEmail(defaultValues?.email || "")}` || "Your Email"},
                  please enter it below.
                </FormDescription>
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full mt-2">
            Verify Email <BadgeCheck />
          </Button>
        </form>
      </Form>
    </div>
  );
};
