import { cn } from "@site-haus/ui/lib/utils";
import { formatDate } from "@site-haus/utils/core/format";
import { statusMeta, type CheckResultRow } from "@/lib/status";

interface HistoryStripProps {
  history: CheckResultRow[];
}

const TICK_TIME: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

// A row of colored ticks, one per recent check, newest on the right. The API
// hands history newest-first, so we reverse for left→right chronology.
export const HistoryStrip = ({ history }: HistoryStripProps) => {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No checks recorded yet.</p>;
  }

  const chronological = [...history].reverse();

  return (
    <div className="flex items-end gap-0.5">
      {chronological.map((r) => (
        <span
          key={r.id}
          title={`${statusMeta(r.status).label} · ${formatDate(r.checkedAt, TICK_TIME)}${
            r.latencyMs != null ? ` · ${r.latencyMs}ms` : ""
          }`}
          className={cn("h-8 flex-1 rounded-sm", statusMeta(r.status).bar)}
        />
      ))}
    </div>
  );
};
