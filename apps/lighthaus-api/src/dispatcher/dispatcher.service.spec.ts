import { jest } from "@jest/globals";
import { ConfigService } from "@nestjs/config";
import { getQueueToken } from "@nestjs/bullmq";
import { Test } from "@nestjs/testing";
import { NOTIFICATIONS_QUEUE } from "./queue.module";
import { DispatcherService, type LighthausJob } from "./dispatcher.service";
import { RESEND_CLIENT } from "./tokens";

const job: LighthausJob = {
  type: "lighthaus.incident_opened",
  monitorId: "m1",
  monitorName: "onehealthclinics.com",
  group: "client-site",
  status: "down",
  detail: { reason: "no-answer" },
  openedAt: new Date("2026-06-26T00:00:00Z").toISOString(),
};

const configValues: Record<string, unknown> = {
  "lighthaus.opsRecipients": ["ops@x.test"],
  "lighthaus.emailFrom": "a@x.test",
  "lighthaus.lighthausUrl": "https://s.test",
};

type AsyncFn = (...args: unknown[]) => Promise<unknown>;

async function build(add: jest.Mock<AsyncFn>, send: jest.Mock<AsyncFn>) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      DispatcherService,
      { provide: getQueueToken(NOTIFICATIONS_QUEUE), useValue: { add } },
      { provide: RESEND_CLIENT, useValue: { emails: { send } } },
      { provide: ConfigService, useValue: { get: (k: string) => configValues[k] } },
    ],
  }).compile();
  return moduleRef.get(DispatcherService);
}

describe("DispatcherService", () => {
  it("enqueues the job and does not touch Resend when Redis is healthy", async () => {
    const add = jest.fn<AsyncFn>().mockResolvedValue(undefined);
    const send = jest.fn<AsyncFn>();
    const dispatcher = await build(add, send);

    await dispatcher.dispatch(job);

    expect(add).toHaveBeenCalledWith("lighthaus.incident_opened", job, expect.any(Object));
    expect(send).not.toHaveBeenCalled();
  });

  it("falls back to a direct Resend send to ops when the queue rejects", async () => {
    const add = jest.fn<AsyncFn>().mockRejectedValue(new Error("redis down"));
    const send = jest.fn<AsyncFn>().mockResolvedValue(undefined);
    const dispatcher = await build(add, send);

    await dispatcher.dispatch(job);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({ to: ["ops@x.test"] });
  });
});
