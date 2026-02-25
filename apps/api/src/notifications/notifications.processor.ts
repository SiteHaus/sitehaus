import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { eq, schema, type Db } from '@site-haus/db';
import {
  renderCommentCreatedEmail,
  renderMilestoneCompletedEmail,
  renderMilestoneCreatedEmail,
  renderMilestoneSignedOffEmail,
  renderPaymentFailedEmail,
} from '@site-haus/transactional/render/notifications';
import { Job } from 'bullmq';
import { DRIZZLE } from 'src/db/tokens';
import { EmailService } from 'src/email/email.service';
import { NOTIFICATIONS_QUEUE } from './notifications.service';
import type { NotificationJobData } from './notifications.types';

const DASHBOARD_URL = process.env.DASHBOARD_URL ?? 'http://localhost:3001';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly email: EmailService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    this.logger.log(`Processing notification: ${job.data.type} [${job.id}]`);

    switch (job.data.type) {
      case 'milestone.created':
        await this.handleMilestoneCreated(job.data);
        break;
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
      default:
        this.logger.warn(`Unknown notification type: ${(job.data as { type: string }).type}`);
    }
  }

  private async handleMilestoneCreated(
    data: Extract<NotificationJobData, { type: 'milestone.created' }>,
  ) {
    const [emails, project] = await Promise.all([
      this.getClientUserEmails(data.clientId),
      this.db.query.projectsTable.findFirst({
        where: eq(schema.projectsTable.id, data.projectId),
        columns: { name: true },
      }),
    ]);
    if (emails.length === 0) return;

    const { subject, html, text } = await renderMilestoneCreatedEmail({
      milestoneName: data.milestoneName,
      projectName: project?.name ?? 'your project',
      ctaUrl: `${DASHBOARD_URL}/projects/${data.projectId}/milestones`,
    });
    await this.email.send({ to: emails, subject, html, text, tags: { type: data.type } });
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
      ctaUrl: `${DASHBOARD_URL}/projects/${data.projectId}/milestones`,
    });
    await this.email.send({ to: emails, subject, html, text, tags: { type: data.type } });
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
      ctaUrl: `${DASHBOARD_URL}/projects/${data.projectId}/milestones`,
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
      // Employee posted → notify the client's users
      emails = await this.getClientUserEmails(data.targetClientId);
    } else {
      // Client posted → notify the project's assigned employee
      // Resolve the project from the target
      const projectId = await this.resolveProjectId(data.targetType, data.targetId);
      if (!projectId) return;

      const project = await this.db.query.projectsTable.findFirst({
        where: eq(schema.projectsTable.id, projectId),
        with: { user: { columns: { email: true } } },
        columns: { id: true },
      });
      emails = project?.user?.email ? [project.user.email] : [];
    }

    if (emails.length === 0) return;

    const { subject, html, text } = await renderCommentCreatedEmail({
      authorName: data.authorName,
      targetLabel: data.targetLabel,
      bodyPreview: data.bodyPreview,
      ctaUrl: `${DASHBOARD_URL}/projects/${data.targetId}`,
    });
    await this.email.send({ to: emails, subject, html, text, tags: { type: data.type } });
  }

  private async handleBillingPaymentFailed(
    data: Extract<NotificationJobData, { type: 'billing.payment_failed' }>,
  ) {
    const emails = await this.getClientUserEmails(data.clientId);
    if (emails.length === 0) return;

    const amountFormatted = `$${(data.amountCents / 100).toFixed(2)}`;
    const { subject, html, text } = await renderPaymentFailedEmail({
      amountFormatted,
      ctaUrl: `${DASHBOARD_URL}/billing`,
    });
    await this.email.send({ to: emails, subject, html, text, tags: { type: data.type } });
  }

  private async getClientUserEmails(clientId: string): Promise<string[]> {
    const rows = await this.db.query.userRolesTable.findMany({
      where: eq(schema.userRolesTable.clientId, clientId),
      with: { user: { columns: { email: true } } },
      columns: { userId: true },
    });
    return [...new Set(rows.map((r) => r.user?.email).filter(Boolean) as string[])];
  }

  private async resolveProjectId(targetType: string, targetId: string): Promise<string | null> {
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
