import { cn } from "@site-haus/ui/lib/utils";

export function EntityCardGrid<T>({
  items,
  layout = "grid",
  keyFor,
  renderCard,
  className,
}: {
  items: T[];
  layout?: "grid" | "stack";
  keyFor: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        layout === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-4",
        className,
      )}
    >
      {items.map((item) => (
        <div key={keyFor(item)}>{renderCard(item)}</div>
      ))}
    </div>
  );
}
