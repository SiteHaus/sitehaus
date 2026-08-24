import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { eq, schema, type Db } from '@site-haus/db';
import {
  renderCommentCreatedEmail,
  renderMilestoneCompletedEmail,
  renderMilestoneSignedOffEmail,
  renderPaymentFailedEmail,
} from '@site-haus/transactional/render/notifications';
import {
  renderDailyDigestEmail,
  renderIncidentOpenedEmail,
  renderIncidentResolvedEmail,
} from '@site-haus/transactional/render/lighthaus';
import { Job } from 'bullmq';
import { DRIZZLE } from 'src/db/tokens';
import { EmailService } from 'src/email/email.service';
import { NOTIFICATIONS_QUEUE } from './notifications.service';
import type { NotificationJobData } from './notifications.types';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private readonly dashboardUrl: string;
  private readonly opsRecipients: string[];
  private readonly statusUrl: string;

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly email: EmailService,
    config: ConfigService,
  ) {
    super();
    this.dashboardUrl = config.get<string>('stripe.dashboardUrl')!;
    this.opsRecipients = config.get<string[]>('ops.recipients') ?? [];
    this.statusUrl = config.get<string>('ops.statusUrl')!;
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    this.logger.log(`Processing notification: ${job.data.type} [${job.id}]`);

    switch (job.data.type) {
      case 'milestone.completed':
        await this.handleMilestoneCompleted(job.data);
        break;
      case 'milestone.signed_off':
        await this.handleMilestoneSignedOff(job.data);
        break;
      case 'comment.created':
        await this.handleCommentCreated(job.data);
        break;
      case 'billing.payment_failed':
        await this.handleBillingPaymentFailed(job.data);
        break;
      case 'lighthaus.incident_opened':
        await this.handleIncidentOpened(job.data);
        break;
      case 'lighthaus.incident_resolved':
        await this.handleIncidentResolved(job.data);
        break;
      case 'lighthaus.daily_digest':
        await this.handleDailyDigest(job.data);
        break;
      default:
        this.logger.warn(
          `Unknown notification type: ${(job.data as { type: string }).type}`,
        );
    }
  }

  private async handleMilestoneCompleted(
    data: Extract<NotificationJobData, { type: 'milestone.completed' }>,
  ) {
    const [emails, project] = await Promise.all([
      this.getClientUserEmails(data.clientId),
      this.db.query.projectsTable.findFirst({
        where: eq(schema.projectsTable.id, data.projectId),
        columns: { name: true },
      }),
    ]);
    if (emails.length === 0) return;

    const { subject, html, text } = await renderMilestoneCompletedEmail({
      milestoneName: data.milestoneName,
      projectName: project?.name ?? 'your project',
      ctaUrl: `${this.dashboardUrl}/projects/${data.projectId}/milestones`,
    });
    await this.email.send({
      to: emails,
      subject,
      html,
      text,
      tags: { type: data.type },
    });
  }

  private async handleMilestoneSignedOff(
    data: Extract<NotificationJobData, { type: 'milestone.signed_off' }>,
  ) {
    const project = await this.db.query.projectsTable.findFirst({
      where: eq(schema.projectsTable.id, data.projectId),
      columns: { userId: true },
      with: { user: { columns: { email: true, firstName: true } } },
    });
    if (!project?.user?.email) return;

    const { subject, html, text } = await renderMilestoneSignedOffEmail({
      milestoneName: data.milestoneName,
      projectName: data.projectName,
      signedOffByName: data.signedOffByName,
      ctaUrl: `${this.dashboardUrl}/projects/${data.projectId}/milestones`,
    });
    await this.email.send({
      to: project.user.email,
      subject,
      html,
      text,
      tags: { type: data.type },
    });
  }

  private async handleCommentCreated(
    data: Extract<NotificationJobData, { type: 'comment.created' }>,
  ) {
    let emails: string[];

    if (data.isEmployeeAuthor) {
      // Employee posted → notify the client's users (excluding the author)
      emails = await this.getClientUserEmails(
        data.targetClientId,
        data.authorId,
      );
    } else {
      // Client posted → notify the project's assigned employee
      const projectId = await this.resolveProjectId(
        data.targetType,
        data.targetId,
      );
      if (!projectId) return;

      const project = await this.db.query.projectsTable.findFirst({
        where: eq(schema.projectsTable.id, projectId),
        with: { user: { columns: { email: true, id: true } } },
        columns: { id: true },
      });
      // Don't notify if the assigned employee is somehow the same user who commented
      const assignedEmail = project?.user?.email;
      emails =
        assignedEmail && project?.user?.id !== data.authorId
          ? [assignedEmail]
          : [];
    }

    if (emails.length === 0) return;

    const ctaPath = await this.resolveCommentCtaPath(
      data.targetType,
      data.targetId,
    );

    const { subject, html, text } = await renderCommentCreatedEmail({
      authorName: data.authorName,
      targetLabel: data.targetLabel,
      bodyPreview: data.bodyPreview,
      ctaUrl: `${this.dashboardUrl}${ctaPath}`,
    });
    await this.email.send({
      to: emails,
      subject,
      html,
      text,
      tags: { type: data.type },
    });
  }

  /**
   * Dashboard-relative path for a comment's target. This was previously
   * built as `/${targetType}/${targetId}` directly, which doesn't match any
   * real dashboard route: projects and tickets are plural
   * (`/projects/:id`, `/tickets/:id`, not `/project/:id` / `/ticket/:id`),
   * and design documents have no standalone route at all — they live at
   * `/projects/:projectId/design-document`, keyed by the parent project,
   * not the design document's own id. Every comment-notification email
   * link was broken as a result.
   */
  private async resolveCommentCtaPath(
    targetType: string,
    targetId: string,
  ): Promise<string> {
    switch (targetType) {
      case 'project':
        return `/projects/${targetId}`;
      case 'ticket':
        return `/tickets/${targetId}`;
      case 'design_document': {
        const row = await this.db.query.designDocumentsTable.findFirst({
          where: eq(schema.designDocumentsTable.id, targetId),
          columns: { projectId: true },
        });
        return row ? `/projects/${row.projectId}/design-document` : '/projects';
      }
      default:
        return '/';
    }
  }

  private async handleBillingPaymentFailed(
    data: Extract<NotificationJobData, { type: 'billing.payment_failed' }>,
  ) {
    const emails = await this.getClientUserEmails(data.clientId);
    if (emails.length === 0) return;

    const amountFormatted = `$${(data.amountCents / 100).toFixed(2)}`;
    const { subject, html, text } = await renderPaymentFailedEmail({
      amountFormatted,
      ctaUrl: `${this.dashboardUrl}/billing`,
    });
    await this.email.send({
      to: emails,
      subject,
      html,
      text,
      tags: { type: data.type },
    });
  }

  // ─── Lighthaus monitoring alerts → ops recipients only (never clients) ──────

  private async handleIncidentOpened(
    data: Extract<NotificationJobData, { type: 'lighthaus.incident_opened' }>,
  ) {
    if (this.opsRecipients.length === 0) return;
    const { subject, html, text } = await renderIncidentOpenedEmail({
      monitorName: data.monitorName,
      group: data.group,
      status: data.status,
      detail: data.detail,
      openedAt: data.openedAt,
      ctaUrl: `${this.statusUrl}/m/${data.monitorId}`,
    });
    await this.email.send({
      to: this.opsRecipients,
      subject,
      html,
      text,
      tags: { type: data.type },
    });
  }

  private async handleIncidentResolved(
    data: Extract<NotificationJobData, { type: 'lighthaus.incident_resolved' }>,
  ) {
    if (this.opsRecipients.length === 0) return;
    const { subject, html, text } = await renderIncidentResolvedEmail({
      monitorName: data.monitorName,
      group: data.group,
      openedAt: data.openedAt,
      resolvedAt: data.resolvedAt,
      downtimeMs: data.downtimeMs,
      ctaUrl: `${this.statusUrl}/m/${data.monitorId}`,
    });
    await this.email.send({
      to: this.opsRecipients,
      subject,
      html,
      text,
      tags: { type: data.type },
    });
  }

  private async handleDailyDigest(
    data: Extract<NotificationJobData, { type: 'lighthaus.daily_digest' }>,
  ) {
    if (this.opsRecipients.length === 0) return;
    const { subject, html, text } = await renderDailyDigestEmail({
      date: data.date,
      summary: data.summary,
      openIncidents: data.openIncidents,
      ctaUrl: this.statusUrl,
    });
    await this.email.send({
      to: this.opsRecipients,
      subject,
      html,
      text,
      tags: { type: data.type },
    });
  }

  private async getClientUserEmails(
    clientId: string,
    excludeUserId?: string,
  ): Promise<string[]> {
    const rows = await this.db.query.userRolesTable.findMany({
      where: eq(schema.userRolesTable.clientId, clientId),
      with: { user: { columns: { email: true, id: true } } },
      columns: { userId: true },
    });
    return [
      ...new Set(
        rows
          .filter((r) => r.user?.email && r.userId !== excludeUserId)
          .map((r) => r.user!.email),
      ),
    ];
  }

  private async resolveProjectId(
    targetType: string,
    targetId: string,
  ): Promise<string | null> {
    switch (targetType) {
      case 'project':
        return targetId;
      case 'ticket': {
        const row = await this.db.query.ticketsTable.findFirst({
          where: eq(schema.ticketsTable.id, targetId),
          columns: { projectId: true },
        });
        return row?.projectId ?? null;
      }
      case 'design_document': {
        const row = await this.db.query.designDocumentsTable.findFirst({
          where: eq(schema.designDocumentsTable.id, targetId),
          columns: { projectId: true },
        });
        return row?.projectId ?? null;
      }
      default:
        return null;
    }
  }
}
