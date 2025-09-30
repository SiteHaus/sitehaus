"use client";

import { useForm } from "react-hook-form";
import { RequestInput, requestPasswordResetSchema } from "@site-haus/validation/forms/password";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@site-haus/ui/components/base/form";
import { Input } from "@site-haus/ui/components/base/input";
import { Button } from "@site-haus/ui/components/base/button";
import { ArrowLeft } from "lucide-react";

export const RequestPasswordResetForm = () => {
  const form = useForm<RequestInput>({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: RequestInput) => {
    try {
      const response = await fetch(""); // TODO: replace with your API
      console.log(values, response);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8">
        <div className="flex items-center mb-4">
          <a
            href="/"
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Login
          </a>
        </div>

        <h2 className="text-2xl font-semibold text-center mb-2">
          Request Password Reset
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Enter your email and we’ll send you a link to reset your password.
        </p>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="you@example.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Request Password
            </Button>
          </form>
        </Form>
    </div>
  );
};
