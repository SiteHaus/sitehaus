export type Dimension = { name: string; values: string[] };

export function generateCombinations(dims: Dimension[]): string[][] {
  return dims
    .filter((d) => d.values.length)
    .reduce<string[][]>((acc, d) => acc.flatMap((c) => d.values.map((v) => [...c, v])), [[]]);
}

export function rowCount(dims: Dimension[]): number {
  return dims.reduce((n, d) => n * Math.max(d.values.length, 0), 1);
}

export function pluralize(word: string): string {
  const w = word.trim();
  if (!w) return w;
  return /s$/i.test(w) ? w : `${w}s`;
}
