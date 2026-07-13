export type Dimension = { name: string; values: string[] };

export function generateCombinations(dims: Dimension[]): string[][] {
  return dims
    .filter((d) => d.values.length)
    .reduce<string[][]>((acc, d) => acc.flatMap((c) => d.values.map((v) => [...c, v])), [[]]);
}

export function rowCount(dims: Dimension[]): number {
  return dims.filter((d) => d.values.length).reduce((n, d) => n * d.values.length, 1);
}

/** A dimension the backend will accept: named, with at least one choice. */
export function isComplete(d: Dimension): boolean {
  return d.name.trim().length > 0 && d.values.length > 0;
}

/** Only the dimensions the backend will accept, with names trimmed. */
export function completeDimensions(dims: Dimension[]): Dimension[] {
  return dims.filter(isComplete).map((d) => ({ ...d, name: d.name.trim() }));
}

/**
 * Indexes of dimensions whose name repeats an earlier one (case-insensitive).
 * The sync endpoint rejects duplicate names, so we flag them before saving.
 */
export function duplicateNameIndexes(dims: Dimension[]): number[] {
  const seen = new Set<string>();
  const dupes: number[] = [];
  dims.forEach((d, i) => {
    const name = d.name.trim().toLowerCase();
    if (!name) return;
    if (seen.has(name)) dupes.push(i);
    else seen.add(name);
  });
  return dupes;
}

/**
 * Plain-language reason the current dimensions can't be saved yet, or null when
 * they're good to go. Mirrors the sync endpoint's schema (name required, at
 * least one value, no duplicate names) so the seller never fires an avoidable
 * 400. A plain product (no dimensions) is always saveable.
 */
export function saveHint(dims: Dimension[]): string | null {
  if (dims.some((d) => !d.name.trim())) return "Say what varies — like Size or Color.";
  if (dims.some((d) => d.values.length === 0)) return "Add at least one choice to each one.";
  if (duplicateNameIndexes(dims).length > 0) return "Two of these have the same name — rename one.";
  return null;
}

export function pluralize(word: string): string {
  const w = word.trim();
  if (!w) return w;
  return /s$/i.test(w) ? w : `${w}s`;
}
