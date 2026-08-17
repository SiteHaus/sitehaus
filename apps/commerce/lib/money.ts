/** Cents -> the string a price input shows. */
export function formatCents(cents: number) {
  return (cents / 100).toFixed(2);
}

/** What a price input holds -> cents. Junk (or an empty box) reads as 0. */
export function parseDollars(val: string) {
  const cents = Math.round(parseFloat(val) * 100);
  return Number.isFinite(cents) ? cents : 0;
}

/** Optional money (compare-at): an empty box means "no sale price", not "$0.00". */
export function formatOptionalCents(cents: number | null) {
  return cents === null ? "" : formatCents(cents);
}

export function parseOptionalDollars(val: string): number | null {
  if (!val.trim()) return null;
  const cents = Math.round(parseFloat(val) * 100);
  return Number.isFinite(cents) ? cents : null;
}
