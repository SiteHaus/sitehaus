import { Card } from "@site-haus/ui/components/base/card";
import { cn } from "@site-haus/ui/lib/utils";
import { label } from "@site-haus/utils/core/format";
import { statusMeta, worstStatus, type StatusMonitorView } from "@/lib/status";
import { MonitorRow } from "./monitor-row";

interface GroupCardProps {
  group: string;
  monitors: StatusMonitorView[];
}

// A titled card for one monitor group. The header dot rolls the group up to its
// worst member so you can read the whole section's health at a glance.
export const GroupCard = ({ group, monitors }: GroupCardProps) => {
  const roll = worstStatus(monitors);
  const meta = statusMeta(roll);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn("size-2.5 rounded-full", meta.dot)} aria-hidden />
          <h2 className="text-xs font-semibold tracking-[0.14em] text-foreground/80 uppercase">
            {label(group)}
          </h2>
        </div>
        <span className={cn("text-xs font-medium", meta.text)}>{meta.label}</span>
      </div>
      <div className="divide-y">
        {monitors.map((m) => (
          <MonitorRow key={m.id} monitor={m} />
        ))}
      </div>
    </Card>
  );
};
