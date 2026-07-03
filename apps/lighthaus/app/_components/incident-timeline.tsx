import { cn } from "@site-haus/ui/lib/utils";
import { formatDate } from "@site-haus/utils/core/format";
import { statusMeta, type Incident } from "@/lib/status";

interface IncidentTimelineProps {
  incidents: Incident[];
}

const DATETIME: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

// Reverse-chronological list of incidents for a monitor. Open incidents (no
// resolvedAt) read as "ongoing"; resolved ones show the recovery time.
export const IncidentTimeline = ({ incidents }: IncidentTimelineProps) => {
  if (incidents.length === 0) {
    return <p className="text-sm text-muted-foreground">No incidents on record. 🎉</p>;
  }

  return (
    <ol className="space-y-4">
      {incidents.map((inc) => {
        const meta = statusMeta(inc.lastStatus);
        return (
          <li key={inc.id} className="flex gap-3">
            <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", meta.dot)} aria-hidden />
            <div className="text-sm">
              <p className="font-medium">
                {meta.label}
                {!inc.resolvedAt && <span className="text-red-600"> · ongoing</span>}
              </p>
              <p className="font-numeric-id text-xs text-muted-foreground">
                Started {formatDate(inc.openedAt, DATETIME)}
                {inc.resolvedAt && ` · recovered ${formatDate(inc.resolvedAt, DATETIME)}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};
