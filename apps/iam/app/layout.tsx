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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div className="min-h-screen w-full flex items-center justify-center bg-background bg-hazy-dots">
          <Providers>
            <div
              className="
                w-full max-w-md mx-4 p-6
                rounded-3xl
                bg-card/80
                backdrop-blur-xl
                border
                "
            >
              {children}
            </div>
          </Providers>
        </div>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
