import { registerAs } from '@nestjs/config';

export default registerAs('email', () => {
  const from = process.env.EMAIL_FROM || 'SiteHaus <noreply@sitehaus.dev>';
  const region = process.env.AWS_REGION || 'us-west-1';
  const configSet = process.env.SES_CONFGURATION_SET || undefined;
  const appBaseUrl = process.env.APP_BASE_URL || 'https://sitehaus.dev';

  return { from, region, configSet, appBaseUrl };
});
