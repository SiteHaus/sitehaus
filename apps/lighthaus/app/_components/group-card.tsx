import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@site-haus/ui/components/base/accordion";
import { Card } from "@site-haus/ui/components/base/card";
import { cn } from "@site-haus/ui/lib/utils";
import { groupLabel, statusMeta, worstStatus, type StatusMonitorView } from "@/lib/status";
import { MonitorRow } from "./monitor-row";

interface GroupCardProps {
  group: string;
  monitors: StatusMonitorView[];
  isStaff: boolean;
}

// A titled card for one monitor group. The header dot rolls the group up to its
// worst member; each site inside is its own accordion (open by default) so sites
// read as distinct, collapsible units rather than one long list.
export const GroupCard = ({ group, monitors, isStaff }: GroupCardProps) => {
  const roll = worstStatus(monitors);
  const meta = statusMeta(roll);

  // Group rows by site (monitor name); each site becomes one accordion item.
  const bySite = monitors.reduce<Map<string, StatusMonitorView[]>>((acc, m) => {
    const list = acc.get(m.name) ?? [];
    list.push(m);
    acc.set(m.name, list);
    return acc;
  }, new Map());
  const sites = [...bySite.entries()];

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn("size-2.5 rounded-full", meta.dot)} aria-hidden />
          <h2 className="text-xs font-semibold tracking-[0.14em] text-foreground/80 uppercase">
            {groupLabel(group, isStaff)}
          </h2>
        </div>
        <span className={cn("text-xs font-medium", meta.text)}>{meta.label}</span>
      </div>

      <Accordion
        type="multiple"
        defaultValue={sites.map(([name]) => name)}
        className="w-full rounded-none border-0"
      >
        {sites.map(([name, rows]) => {
          const siteRoll = worstStatus(rows);
          const siteMeta = statusMeta(siteRoll);
          return (
            <AccordionItem key={name} value={name} className="data-[state=open]:bg-transparent">
              <AccordionTrigger className="items-center px-4 py-3 hover:no-underline">
                <span className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                  <span
                    className={cn("size-2.5 shrink-0 rounded-full", siteMeta.dot)}
                    aria-hidden
                  />
                  <span className="truncate text-sm font-medium">{name}</span>
                  <span className={cn("ml-auto text-xs font-medium", siteMeta.text)}>
                    {siteMeta.label}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="-mx-4 pb-0 [&_a]:no-underline">
                <div className="divide-y border-t">
                  {rows.map((m) => (
                    <MonitorRow key={m.id} monitor={m} isStaff={isStaff} showName={false} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Card>
  );
};
