"use client";

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
import { ResetInput, resetPasswordSchema } from "@site-haus/validation/forms/password";
import { useForm } from "react-hook-form";

export const ResetPasswordForm = () => {
  const form = useForm<ResetInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      code: "",
      newPassword: "",
    },
  });

  const onSubmit = async (values: ResetInput) => {
    try {
      const response = await fetch("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8">
      <h2 className="text-2xl font-semibold text-center mb-6">Reset Password</h2>
      <p className="text-sm text-gray-500 text-center mb-6">
        Enter your code and new password below to reset your account.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel> Email </FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input placeholder="123456" {...field} />
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
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full mt-2">
            Reset Password
          </Button>
        </form>
      </Form>
    </div>
  );
};
