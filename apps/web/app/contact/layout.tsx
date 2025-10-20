import type { Metadata } from "next";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@site-haus/ui/components/base/navigation-menu";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Consultation Form - SiteHaus",
  description: "Fill out this form to send us a request for consultation!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <body>{children}</body>
    </>
  );
}
