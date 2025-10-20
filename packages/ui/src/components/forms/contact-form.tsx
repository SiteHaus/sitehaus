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
import {
  CreateContactInput,
  createContactSchema,
} from "@site-haus/validation/forms/contact";
import { ReactNode } from "react";
import { useForm } from "react-hook-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@site-haus/ui/components/base/card";

export const FormGroup = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col md:flex-row gap-4">{children}</div>
);

export const CreateContactForm = () => {
  const form = useForm<CreateContactInput>({
    resolver: zodResolver(createContactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
      email: "",
    },
  });

  const onSubmit = (values: CreateContactInput) => {
    console.log(values);
  };

  return (
    <Card className="bg-card border border-border shadow-lg rounded-2xl overflow-hidden">
      <CardHeader className="text-center ">
        <CardTitle className="text-3xl font-extrabold text-foreground">
          Contact Us
        </CardTitle>
        <CardDescription className="text-muted-foreground mt-1">
          Fill out the form to set up a consultation with us.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 px-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormGroup>
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-foreground">
                      First Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="SiteHaus"
                        className="
                          bg-input text-foreground placeholder:text-muted-foreground
                          border border-border rounded-lg
                          focus:ring-2 focus:ring-ring focus:border-ring
                          transition
                        "
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-destructive" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-foreground">Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Client"
                        className="
                          bg-input text-foreground placeholder:text-muted-foreground
                          border border-border rounded-lg
                          focus:ring-2 focus:ring-ring focus:border-ring
                          transition
                        "
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-destructive" />
                  </FormItem>
                )}
              />
            </FormGroup>

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">
                    Phone Number
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(123)-456-8790"
                      className="
                        bg-input text-foreground placeholder:text-muted-foreground
                        border border-border rounded-lg
                        focus:ring-2 focus:ring-ring focus:border-ring
                        transition
                      "
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-destructive" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="site-haus@gmail.com"
                      className="
                        bg-input text-foreground placeholder:text-muted-foreground
                        border border-border rounded-lg
                        focus:ring-2 focus:ring-ring focus:border-ring
                        transition
                      "
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-destructive" />
                </FormItem>
              )}
            />

            <CardFooter className="flex justify-end pt-4">
              <Button
                type="submit"
                className="
                  bg-primary text-primary-foreground
                  hover:bg-primary/90
                  shadow-md hover:shadow-lg
                  transition-all duration-300
                  px-6 py-2 rounded-lg
                "
              >
                Consult
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
