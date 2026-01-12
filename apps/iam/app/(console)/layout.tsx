import { ReactNode } from "react";
import { SiteNav } from "../components/navigation/site-nav";

export default function ConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <SiteNav />
      {children}
    </div>
  );
}
