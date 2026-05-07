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
    images: ["/og.png"],
  },
  keywords: [
    "hire software developer Utah",
    "contact web development agency",
    "start a software project Utah",
    "web developer consultation",
  ],
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
