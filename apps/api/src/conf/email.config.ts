import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  from: process.env.EMAIL_FROM ?? 'Site Haus <noreply@notify.sitehaus.dev>',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  appBaseUrl: process.env.IAM_APP_URL ?? 'http://localhost:3002',
  // Real sending defaults on in production/staging (both bake NODE_ENV=production
  // into the Docker image) and off everywhere else — a local `nest start` should
  // never be able to email a real recipient just because a real RESEND_API_KEY is
  // sitting in .env. EMAIL_ENABLED, if set, always wins (explicit kill switch in
  // prod, or explicit opt-in to test real sends locally).
  enabled:
    process.env.EMAIL_ENABLED != null
      ? process.env.EMAIL_ENABLED === 'true'
      : process.env.NODE_ENV === 'production',
  devRedirect: process.env.EMAIL_DEV_REDIRECT ?? null,
}));
