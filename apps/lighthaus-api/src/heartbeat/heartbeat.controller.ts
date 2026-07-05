import { BadRequestException, Body, Controller, Post, UseGuards } from "@nestjs/common";
import { MonitorRepository } from "../persistence/monitor.repository";
import { HeartbeatIngestGuard } from "./heartbeat.guard";

/**
 * Push ingest for heartbeat monitors. Services that can't be polled (e.g. the
 * commerce BullMQ worker) POST here on their own cadence; a missing heartbeat is
 * what evaluateHeartbeat later turns into a `down`.
 */
@Controller("heartbeat")
@UseGuards(HeartbeatIngestGuard)
export class HeartbeatController {
  constructor(private readonly repo: MonitorRepository) {}

  @Post()
  async ingest(@Body() body: { service?: unknown }): Promise<{ ok: true }> {
    if (typeof body?.service !== "string" || body.service.length === 0) {
      throw new BadRequestException("service is required");
    }
    await this.repo.recordHeartbeat(body.service);
    return { ok: true };
  }
}
