import type { LucideIcon } from "lucide-react";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
  size?: "default" | "lg";
  back?: React.ReactNode;
}

export function PageHero({
  title,
  subtitle,
  icon: Icon,
  children,
  className = "",
  size = "default",
  back,
}: PageHeroProps) {
  const isLg = size === "lg";
  const padClass = isLg ? "" : "py-8";
  return (
    <div
      className={`-mx-4 md:-mx-6 bg-sidebar border-b border-border px-4 md:px-6 ${padClass} flex flex-col gap-2 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {Icon && (
            <div
              className={`mt-0.5 flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 ${isLg ? "h-14 w-14" : "h-11 w-11"}`}
            >
              <Icon className={isLg ? "h-7 w-7" : "h-5 w-5"} />
            </div>
          )}
          <div>
            {back && <div className="mb-2">{back}</div>}
            <h1 className={`font-bold tracking-tight ${isLg ? "text-4xl" : "text-3xl"}`}>
              {title}
            </h1>
            {subtitle && (
              <p className={`text-muted-foreground mt-1.5 ${isLg ? "text-base" : "text-sm"}`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {children && <div className="shrink-0 mt-1">{children}</div>}
      </div>
    </div>
  );
}
