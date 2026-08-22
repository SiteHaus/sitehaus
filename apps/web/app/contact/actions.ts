"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export type ContactState = { success: true } | { error: string } | null;

export async function submitContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = formData.get("name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";
  const company = formData.get("company")?.toString().trim() ?? "";
  const message = formData.get("message")?.toString().trim() ?? "";

  if (!name || !email || !message) {
    return { error: "Please fill out all required fields." };
  }

  if (!email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  const lines = [
    `Name: ${name}`,
    `Email: ${email}`,
    company ? `Company: ${company}` : null,
    ``,
    `Message:`,
    message,
  ].filter((l) => l !== null);

  // Real sending defaults on in production/staging (both bake NODE_ENV=production
  // into the Docker image) and off everywhere else, so a local `pnpm dev` can't
  // email a real inbox just because a real RESEND_API_KEY is sitting in .env.
  // EMAIL_ENABLED, if set, always wins.
  const enabled =
    process.env.EMAIL_ENABLED != null
      ? process.env.EMAIL_ENABLED === "true"
      : process.env.NODE_ENV === "production";

  if (!enabled) {
    console.warn(`Email disabled (non-production) — skipping contact send from ${email}`);
    return { success: true };
  }

  const { error } = await resend.emails.send({
    from: "SiteHaus <noreply@notify.sitehaus.dev>",
    to: "sitehausdev@gmail.com",
    replyTo: email,
    subject: `New inquiry from ${name}`,
    text: lines.join("\n"),
  });

  if (error) {
    return { error: "Something went wrong. Please try again." };
  }

  return { success: true };
}
