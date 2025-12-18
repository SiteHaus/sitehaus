import { ReactNode } from "react";
import { TopNav } from "../components/navigation/top-nav";

export default function ConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <TopNav />
      {children}
    </div>
  );
}
