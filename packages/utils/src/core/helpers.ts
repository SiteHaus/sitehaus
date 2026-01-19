import UAParser from "ua-parser-js";

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

  const parser = new UAParser(ua);
  const result = parser.getResult();

  return {
    platform: result.os.name || undefined,
    browser: result.browser.name || undefined,
  };
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
