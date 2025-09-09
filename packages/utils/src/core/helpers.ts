export const toArray = (v?: string | string[]): string[] => {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
};

export const htmlToText = (html?: string): string | undefined => {
  if (!html) return undefined;
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};
