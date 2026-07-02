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
