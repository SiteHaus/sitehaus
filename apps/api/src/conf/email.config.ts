import { registerAs } from '@nestjs/config';

export default registerAs('email', () => {
  const from = process.env.EMAIL_FROM ?? 'Site Haus <noreply@sitehaus.dev>';
  const replyTo = process.env.EMAIL_REPLY_TO;
  const region =
    process.env.EMAIL_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
  const configSet = process.env.EMAIL_CONFIG_SET;
  const appBaseUrl = process.env.APP_BASE_URL ?? 'https://sitehaus.dev';

  return { from, replyTo, region, configSet, appBaseUrl } as const;
});
