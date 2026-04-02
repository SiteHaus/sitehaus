import type { Metadata } from "next";
import { Toaster } from "sonner";
import Providers from "./providers/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteHaus - Commerce Admin",
  description: "SiteHaus Commerce Admin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
