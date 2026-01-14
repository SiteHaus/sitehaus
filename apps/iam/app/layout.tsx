import type { Metadata } from "next";
import localFont from "next/font/local";

import { Toaster } from "@site-haus/ui/components/base/sonner";
import "./globals.css";
import Providers from "./providers/providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Identity Gateway",
  description:
    "Identity gateway manages users, roles, and invites for all our first party clients.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`
          ${geistSans.variable} ${geistMono.variable}
          bg-muted text-foreground
          min-h-screen
          bg-hazy-dots
        `}
      >
        <Providers>{children}</Providers>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
