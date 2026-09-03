export type Tone = "active" | "success" | "info" | "warning" | "danger" | "neutral";

export function toneClass(tone: Tone): string {
  return `tone-${tone}`;
}
