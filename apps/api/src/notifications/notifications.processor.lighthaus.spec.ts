import { jest } from '@jest/globals';
import type { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import type { Db } from '@site-haus/db';
import type { EmailService } from 'src/email/email.service';
import { NotificationsProcessor } from './notifications.processor';
import type { NotificationJobData } from './notifications.types';

const config = {
  get: (key: string) =>
    ({
      'stripe.dashboardUrl': 'https://dashboard.test',
      'ops.recipients': ['ops@x.test'],
      'ops.statusUrl': 'https://status.test',
    })[key],
} as unknown as ConfigService;

function makeProcessor() {
  const send = jest.fn(async () => undefined);
  const email = { send } as unknown as EmailService;
  const db = {} as Db;
  const processor = new NotificationsProcessor(db, email, config);
  return { processor, send };
}

const job = (data: NotificationJobData) =>
  ({ id: '1', data }) as Job<NotificationJobData>;

describe('NotificationsProcessor — lighthaus.* → ops', () => {
  it('routes incident_opened to ops recipients only', async () => {
    const { processor, send } = makeProcessor();
    await processor.process(
      job({
        type: 'lighthaus.incident_opened',
        monitorId: 'm1',
        monitorName: 'onehealthclinics.com',
        group: 'client-site',
        status: 'down',
        detail: { reason: 'no-answer' },
        openedAt: '2026-06-26T00:00:00.000Z',
      }),
    );
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({
      to: ['ops@x.test'],
      tags: { type: 'lighthaus.incident_opened' },
    });
  });

  it('renders a readable digest: problems lead with check labels, healthy groups collapse', async () => {
    const { processor, send } = makeProcessor();
    await processor.process(
      job({
        type: 'lighthaus.daily_digest',
        date: '2026-07-06',
        summary: [
          {
            monitorName: 'api.sitehaus.dev',
            type: 'service_health',
            group: 'sh-service',
            uptime24h: 0,
            status: 'down',
          },
          {
            monitorName: 'api.sitehaus.dev',
            type: 'ssl',
            group: 'sh-service',
            uptime24h: 100,
            status: 'up',
          },
          {
            monitorName: 'onehealthclinics.com',
            type: 'http',
            group: 'client-site',
            uptime24h: 100,
            status: 'up',
          },
        ],
        openIncidents: [
          {
            monitorName: 'api.sitehaus.dev',
            type: 'service_health',
            openedAt: '2026-07-05T13:58:59.000Z',
          },
        ],
      }),
    );
    expect(send).toHaveBeenCalledTimes(1);
    const sent = send.mock.calls[0][0] as { subject: string; text: string };
    expect(sent.subject).toContain('1 open');
    // Down row is disambiguated by its check label and carries the open-since time
    expect(sent.text).toContain('api.sitehaus.dev · Health');
    expect(sent.text).toContain('open since');
    // Healthy rows collapse to one line per group instead of one per check
    expect(sent.text).toContain('sh-service');
    expect(sent.text).toContain('client-site');
    expect(sent.text).not.toContain('onehealthclinics.com · HTTP');
  });

  it('does not send when there are no ops recipients', async () => {
    const send = jest.fn(async () => undefined);
    const noOps = {
      get: (key: string) =>
        ({
          'stripe.dashboardUrl': 'https://dashboard.test',
          'ops.recipients': [],
          'ops.statusUrl': 'https://status.test',
        })[key],
    } as unknown as ConfigService;
    const processor = new NotificationsProcessor(
      {} as Db,
      { send } as unknown as EmailService,
      noOps,
    );
    await processor.process(
      job({
        type: 'lighthaus.daily_digest',
        date: '2026-06-26',
        summary: [],
        openIncidents: [],
      }),
    );
    expect(send).not.toHaveBeenCalled();
  });
});
