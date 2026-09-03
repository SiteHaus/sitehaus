import { Badge } from "@site-haus/ui/components/base/badge";
import { cn } from "@site-haus/ui/lib/utils";
import { toneClass, type Tone } from "@site-haus/ui/components/shared/status-tone";

export function StatusBadge({
  tone,
  label,
  dot = true,
  className,
}: {
  tone: Tone;
  label: string;
  dot?: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("status-badge gap-1.5 font-medium", toneClass(tone), className)}
    >
      {dot && <span className="size-1.5 rounded-full" style={{ background: "var(--tone)" }} />}
      {label}
    </Badge>
  );
}
