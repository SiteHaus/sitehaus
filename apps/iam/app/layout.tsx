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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex items-center justify-center bg-background`}
      >
        <Providers>
          <div className="w-full max-w-md p-6 bg-card rounded-2xl shadow-md">
            {children}
          </div>
        </Providers>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
