import { Button } from "@site-haus/ui/components/base/button";
import { ModeToggle } from "@site-haus/ui/components/base/mode-toggle";
import { Rocket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type Link = {
  text: string;
  href: string;
};

const topNavLinks: Link[] = [
  {
    text: "Work",
    href: "/work",
  },
  {
    text: "Services",
    href: "/services",
  },
  {
    text: "About",
    href: "/about",
  },
  {
    text: "Our Method",
    href: "/our-method",
  },
];

export const SiteNav = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between container mx-auto bg-background/50 backdrop-blur mt-2 px-6 py-2 rounded-2xl border shadow-md">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/sitehaus-icon.svg"
            width={25}
            height={25}
            alt="Sitehaus"
            className="filter dark:invert"
          />
          <span className="text-xl font-bold tracking-wide">SiteHaus</span>
        </Link>

        <div className="flex items-center justify-end gap-4">
          {topNavLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.text}
            </Link>
          ))}

          <div className="flex gap-2 ml-4">
            <ModeToggle />

            <Button variant="outline" className="tracking-wide">
              Contact Us
            </Button>
            <Button className="tracking-wide">
              Start a project
              <Rocket />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
