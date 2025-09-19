"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@site-haus/ui/components/base/form";
import {Input} from "@site-haus/ui/components/base/input";
import { useForm } from "react-hook-form";
import {RegisterInput, registerSchema} from "@site-haus/validation/forms/auth"
import { zodResolver } from "@hookform/resolvers/zod";
import { ReactNode } from "react";
import { Button } from "@site-haus/ui/components/base/button"



export const FormGroup = ({ children }: { children: ReactNode }) => {
  return <div className="flex flex-col md:flex-row gap-2">{children}</div>;
};


export const LoginForm = () => {
    const form = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
          email: "",
          password: ""
        },
      });
    const onSubmit = (values: RegisterInput) => {
        console.log(values);
    };

    return (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <h2 className="text-xl font-bold mb-6">Login</h2>
            <FormGroup>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Lunas Portfolio" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input placeholder="Password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First Name" {...field} />
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
                      <Input placeholder="Last Name
                      " {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>
            <Button type="submit" className="mt-4">
                Submit
            </Button>
        </form>
    </Form>
    )
}