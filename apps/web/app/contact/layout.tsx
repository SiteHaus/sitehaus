import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Start a conversation about your project. No commitment, no sales pitch — just a conversation about what you're building.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact | SiteHaus",
    description:
      "Start a conversation about your project. No commitment, no sales pitch — just a conversation about what you're building.",
    url: "/contact",
  },
  twitter: {
    title: "Contact | SiteHaus",
    description:
      "Start a conversation about your project. No commitment, no sales pitch — just a conversation about what you're building.",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
