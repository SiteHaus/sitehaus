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

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const buildAcceptUrl = (
  base: string,
  p: { clientId: string; email: string; code: string }
) => {
  const u = new URL("/accept-invite", base);
  u.searchParams.set("clientId", p.clientId);
  u.searchParams.set("email", p.email);
  u.searchParams.set("code", p.code);
  return u.toString();
};

export const maskEmail = (email: string): string => {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;

  if (user.length <= 2) return `${user[0]}***@${domain}`;

  const first = user[0];
  const last = user[user.length - 1];
  const maskedUser = `${first}${"*".repeat(Math.max(2, user.length - 2))}${last}`;

  return `${maskedUser}@${domain}`;
};

export const deriveAuthForLabel = (
  nextUrl?: string,
  fallback: string = "Unknown App"
) => {
  try {
    if (!nextUrl) return fallback;

    const url = new URL(nextUrl);
    const host = url.hostname.replace(/^www\./, "");

    return host;
  } catch {
    return fallback;
  }
};
