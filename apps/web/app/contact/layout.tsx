import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start a Project",
  description:
    "Ready to build something? Reach out — we're based in Utah and work with businesses across Ogden, Salt Lake City, and St. George. No commitment, no sales pitch.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Start a Project | SiteHaus",
    description:
      "Ready to build something? Reach out — we're based in Utah and work with businesses across Ogden, Salt Lake City, and St. George.",
    url: "/contact",
  },
  twitter: {
    title: "Start a Project | SiteHaus",
    description:
      "Ready to build something? Reach out — we're based in Utah and work with businesses across Ogden, Salt Lake City, and St. George.",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
