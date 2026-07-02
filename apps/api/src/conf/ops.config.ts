import { registerAs } from '@nestjs/config';

// Ops alerting for Lighthaus monitoring jobs. `recipients` are internal ops
// addresses only — never client users. `statusUrl` is the Lighthaus status UI
// linked from alert emails.
export default registerAs('ops', () => ({
  recipients: (process.env.OPS_RECIPIENTS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  statusUrl: process.env.LIGHTHAUS_URL ?? 'https://status.sitehaus.dev',
}));
