import { ThemeProvider } from "@site-haus/ui/components/base/theme-provider";
import type { Metadata } from "next";
import { Baskervville, Figtree } from "next/font/google";

import { SiteNav } from "./components/site-nav";
import "./globals.css";

const displayFont = Baskervville({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "700"],
});

const bodyFont = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SiteHaus",
  description: "Your businesses strategic software partner.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${displayFont.variable} ${bodyFont.variable} bg-hazy-dots`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteNav />
          {children}
          <footer>{new Date().getFullYear().toString()} © SiteHaus</footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
