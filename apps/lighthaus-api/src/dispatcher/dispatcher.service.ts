import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import type { Queue } from "bullmq";
import type { Resend } from "resend";
import { NOTIFICATIONS_QUEUE, RESEND_CLIENT } from "./tokens";

/**
 * The three lighthaus.* job payloads. This union MUST stay byte-for-byte
 * aligned with the additions to apps/api's `NotificationJobData` (Task 17) —
 * both sides share the same `notifications` BullMQ queue.
 */
export type LighthausJob =
  | {
      type: "lighthaus.incident_opened";
      monitorId: string;
      monitorName: string;
      group: string;
      status: string;
      detail: Record<string, unknown>;
      openedAt: string;
    }
  | {
      type: "lighthaus.incident_resolved";
      monitorId: string;
      monitorName: string;
      group: string;
      openedAt: string;
      resolvedAt: string;
      downtimeMs: number;
    }
  | {
      type: "lighthaus.daily_digest";
      date: string;
      summary: {
        monitorName: string;
        type: string;
        group: string;
        uptime24h: number;
        status: string;
      }[];
      openIncidents: { monitorName: string; type: string; openedAt: string }[];
    };

@Injectable()
export class DispatcherService {
  private readonly logger = new Logger(DispatcherService.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<LighthausJob>,
    @Inject(RESEND_CLIENT) private readonly resend: Resend,
    private readonly config: ConfigService,
  ) {}

  async dispatch(job: LighthausJob): Promise<void> {
    try {
      await this.queue.add(job.type, job, {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      });
    } catch (err) {
      this.logger.error(
        `Queue enqueue failed for ${job.type}; falling back to direct Resend send`,
        err instanceof Error ? err.stack : String(err),
      );
      await this.failsafeSend(job);
    }
  }

  private async failsafeSend(job: LighthausJob): Promise<void> {
    const to = this.config.get<string[]>("lighthaus.opsRecipients") ?? [];
    if (to.length === 0) {
      this.logger.warn("No OPS_RECIPIENTS configured; dropping failsafe alert");
      return;
    }

    // Real sending defaults on in production/staging (both bake NODE_ENV=production
    // into the Docker image) and off everywhere else — this bypasses the queue
    // entirely and hits Resend directly, so it needs its own guard rather than
    // relying on anything downstream. EMAIL_ENABLED, if set, always wins.
    const enabled =
      process.env.EMAIL_ENABLED != null
        ? process.env.EMAIL_ENABLED === "true"
        : process.env.NODE_ENV === "production";
    if (!enabled) {
      this.logger.warn(
        `Email disabled (non-production) — skipping failsafe send to ${to.join(", ")}: [Lighthaus failsafe] ${job.type}`,
      );
      return;
    }

    const from = this.config.get<string>("lighthaus.emailFrom")!;
    const devRedirect = this.config.get<string | null>("lighthaus.emailDevRedirect");
    const recipient = devRedirect ? [devRedirect] : to;
    if (devRedirect) {
      this.logger.warn(`DEV redirect: ${to.join(", ")} → ${devRedirect}`);
    }
    try {
      await this.resend.emails.send({
        from,
        to: recipient,
        subject: `[Lighthaus failsafe] ${job.type}`,
        text: `Queue was unavailable. Raw job payload:\n\n${JSON.stringify(job, null, 2)}`,
      });
    } catch (err) {
      this.logger.error(
        "Failsafe Resend send also failed — alert lost",
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
