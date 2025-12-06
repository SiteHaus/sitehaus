import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  from: process.env.EMAIL_FROM ?? 'Site Haus <noreply@notify.sitehaus.dev>',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
  enabled: process.env.EMAIL_ENABLED !== 'false',
}));
