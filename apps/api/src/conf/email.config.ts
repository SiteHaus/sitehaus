import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  from: process.env.EMAIL_FROM ?? 'Site Haus <noreply@notify.sitehaus.dev>',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  appBaseUrl: process.env.IAM_APP_URL ?? 'http://localhost:3002',
  enabled: process.env.EMAIL_ENABLED !== 'false',
  devRedirect: process.env.EMAIL_DEV_REDIRECT ?? null,
}));
