export function formatDate(
  d: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString(
    "en-US",
    opts ?? { month: "short", day: "numeric", year: "numeric" }
  );
}

export function formatCents(
  cents: number | null | undefined,
  currency = "USD"
): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** "in_progress" → "In progress" */
export function label(s: string): string {
  return s.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());
}
