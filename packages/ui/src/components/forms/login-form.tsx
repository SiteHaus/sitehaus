"use client";

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
import { useForm } from "react-hook-form";
import { LoginInput, loginSchema } from "@site-haus/validation/forms/auth";
import { zodResolver } from "@hookform/resolvers/zod";

export const LoginForm = () => {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginInput) => {
    try {
      const response = await fetch("http://localhost:3001/auth/login", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      console.log(data);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8">
      <h2 className="text-2xl font-semibold text-center mb-2">Welcome</h2>
      <p className="text-sm text-gray-500 text-center mb-6">
        Please log in to your account
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full">
            Log In
          </Button>

          <p className="text-sm text-center text-gray-500 mt-4">
            Forgot username or password?{" "}
            <a href="/request-password" className="text-blue-600 hover:underline">
              Reset Password
            </a>
          </p>

          <p className="text-sm text-center text-gray-500 mt-4">
            Don’t have an account?{" "}
            <a href="/register" className="text-blue-600 hover:underline">
              Sign up
            </a>
          </p>
        </form>
      </Form>
    </div>
  );
};
