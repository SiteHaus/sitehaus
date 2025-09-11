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

export const parseUserAgent = (ua?: string) => {
  if (!ua) return {};
  const u = ua.toLowerCase();
  const platform =
    u.includes("iphone") || u.includes("ipad")
      ? "iOS"
      : u.includes("android")
        ? "Android"
        : u.includes("windows")
          ? "Windows"
          : u.includes("mac os x") || u.includes("macintosh")
            ? "macOS"
            : u.includes("linux")
              ? "Linux"
              : undefined;

  const browser = u.includes("edg")
    ? "Edge"
    : u.includes("crios") || (u.includes("chrome") && !u.includes("edg"))
      ? "Chrome"
      : u.includes("safari") && !u.includes("chrome")
        ? "Safari"
        : u.includes("firefox")
          ? "Firefox"
          : undefined;

  return { platform, browser };
};
