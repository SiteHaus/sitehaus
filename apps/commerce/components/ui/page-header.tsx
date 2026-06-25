import { cn } from "@site-haus/ui/lib/utils";

export function PageHeader({
  eyebrow = "Store",
  title,
  subtitle,
  actions,
  aside,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex items-start justify-between gap-4", className)}>
      <div>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
          {eyebrow}
        </p>
        <h1 className="font-display mt-0.5 text-3xl font-medium tracking-tight">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
      </div>
      {(aside || actions) && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {aside}
        </div>
      )}
    </div>
  );
}
