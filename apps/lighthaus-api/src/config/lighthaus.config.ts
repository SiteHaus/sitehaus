import { registerAs } from "@nestjs/config";

// Mirror apps/api/src/conf/auth.config.ts exactly so tokens minted by the IAM
// api validate identically here: prefer the base64url secret, fall back to utf-8.
function resolveJwtSecret(): Buffer | null {
  if (process.env.JWT_SECRET_B64URL) {
    return Buffer.from(process.env.JWT_SECRET_B64URL, "base64url");
  }
  if (process.env.JWT_SECRET) {
    return Buffer.from(process.env.JWT_SECRET, "utf-8");
  }
  return null;
}

export default registerAs("lighthaus", () => ({
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL ?? "redis://redis:6379",
  resendApiKey: process.env.RESEND_API_KEY!,
  emailFrom: process.env.EMAIL_FROM ?? "Lighthaus <alerts@sitehaus.dev>",
  opsRecipients: (process.env.OPS_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  healthchecksUrl: process.env.HEALTHCHECKS_URL ?? "",
  // Shared secret that heartbeat pushers (e.g. commerce-worker) send as
  // `Authorization: Bearer <secret>`. Unset → the ingest endpoint fails closed.
  heartbeatSecret: process.env.HEARTBEAT_SECRET ?? "",
  lighthausUrl: process.env.LIGHTHAUS_URL ?? "https://status.sitehaus.dev",
  port: Number(process.env.LIGHTHAUS_PORT ?? 3007),
  // Same secret apps/api signs IAM access tokens with — lets us validate them here.
  jwtSecret: resolveJwtSecret(),
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    bucket: process.env.R2_STATUS_BUCKET ?? "lighthaus-status",
    publicBaseUrl: process.env.R2_STATUS_PUBLIC_URL ?? "",
  },
}));
