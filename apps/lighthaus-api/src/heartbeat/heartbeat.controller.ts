import { Body, Controller, Post } from "@nestjs/common";
import { MonitorRepository } from "../persistence/monitor.repository";

/**
 * Push ingest for heartbeat monitors. Services that can't be polled (e.g. the
 * commerce BullMQ worker) POST here on their own cadence; a missing heartbeat is
 * what evaluateHeartbeat later turns into a `down`.
 */
@Controller("heartbeat")
export class HeartbeatController {
  constructor(private readonly repo: MonitorRepository) {}

  @Post()
  async ingest(@Body() body: { service: string }): Promise<{ ok: true }> {
    await this.repo.recordHeartbeat(body.service);
    return { ok: true };
  }
}
