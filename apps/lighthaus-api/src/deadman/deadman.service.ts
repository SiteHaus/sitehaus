import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Dead-man's switch: on each fast cycle we ping an external healthchecks.io-style
 * URL. If lighthaus itself dies, that URL stops receiving pings and the external
 * service alerts — "who watches the watcher".
 */
@Injectable()
export class DeadmanService {
  private readonly logger = new Logger(DeadmanService.name);

  constructor(private readonly config: ConfigService) {}

  async ping(): Promise<void> {
    const url = this.config.get<string>("lighthaus.healthchecksUrl");
    if (!url) return;
    try {
      // Bounded: a hanging healthchecks endpoint must not stall the fast cycle.
      await fetch(url, { signal: AbortSignal.timeout(10_000) });
    } catch (err) {
      this.logger.warn(`deadman ping failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
