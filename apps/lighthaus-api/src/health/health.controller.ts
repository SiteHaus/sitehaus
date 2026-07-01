import { Controller, Get } from "@nestjs/common";

const startedAt = Date.now();

@Controller("health")
export class HealthController {
  @Get()
  check(): { status: string; uptime: number; version: string } {
    return {
      status: "ok",
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      version: process.env.APP_VERSION ?? "dev",
    };
  }
}
