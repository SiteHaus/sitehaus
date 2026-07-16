export type NotificationJobData =
  | {
      type: 'milestone.completed';
      milestoneId: string;
      milestoneName: string;
      projectId: string;
      clientId: string;
    }
  | {
      type: 'milestone.signed_off';
      milestoneId: string;
      milestoneName: string;
      projectId: string;
      projectName: string;
      signedOffByName: string;
    }
  | {
      type: 'comment.created';
      commentId: string;
      authorId: string;
      authorName: string;
      bodyPreview: string;
      targetType: string;
      targetId: string;
      targetLabel: string;
      /** clientId of the org the target belongs to */
      targetClientId: string;
      /** true = author is a SiteHaus employee */
      isEmployeeAuthor: boolean;
    }
  | {
      type: 'billing.payment_failed';
      billingRecordId: string;
      clientId: string;
      amountCents: number;
    }
  // Lighthaus monitoring alerts — enqueued by apps/lighthaus-api onto this same
  // queue. These MUST stay byte-for-byte aligned with `LighthausJob` in
  // apps/lighthaus-api/src/dispatcher/dispatcher.service.ts.
  | {
      type: 'lighthaus.incident_opened';
      monitorId: string;
      monitorName: string;
      group: string;
      status: string;
      detail: Record<string, unknown>;
      openedAt: string;
    }
  | {
      type: 'lighthaus.incident_resolved';
      monitorId: string;
      monitorName: string;
      group: string;
      openedAt: string;
      resolvedAt: string;
      downtimeMs: number;
    }
  | {
      type: 'lighthaus.daily_digest';
      date: string;
      summary: {
        monitorName: string;
        /** check type (http/dns/ssl/…) — one site is many monitors sharing a name */
        type: string;
        group: string;
        uptime24h: number;
        status: string;
      }[];
      openIncidents: { monitorName: string; type: string; openedAt: string }[];
    };
