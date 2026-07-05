import { jest } from "@jest/globals";
import type { MonitorRepository } from "../persistence/monitor.repository";
import { HeartbeatController } from "./heartbeat.controller";

describe("HeartbeatController", () => {
  it("records the heartbeat for the named service and returns ok", async () => {
    const recordHeartbeat = jest.fn(async () => undefined);
    const repo = { recordHeartbeat } as unknown as MonitorRepository;
    const controller = new HeartbeatController(repo);

    const res = await controller.ingest({ service: "commerce-worker" });

    expect(recordHeartbeat).toHaveBeenCalledWith("commerce-worker");
    expect(res).toEqual({ ok: true });
  });

  it.each([{}, { service: "" }, { service: 42 }])(
    "rejects a body without a usable service name (%p)",
    async (body) => {
      const recordHeartbeat = jest.fn(async () => undefined);
      const repo = { recordHeartbeat } as unknown as MonitorRepository;
      const controller = new HeartbeatController(repo);

      await expect(controller.ingest(body as { service?: unknown })).rejects.toThrow(
        "service is required",
      );
      expect(recordHeartbeat).not.toHaveBeenCalled();
    },
  );
});
