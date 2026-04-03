import { ClientSwitcher } from "@/app/components/navigation/client-switcher";
import { SiteNav } from "@/app/components/navigation/site-nav";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteNav />
      <ClientSwitcher />
      <main className="flex-1">{children}</main>
    </div>
  );
}
