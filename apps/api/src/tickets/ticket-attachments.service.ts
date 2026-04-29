import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, schema, type Db } from '@site-haus/db';
import { AuditService } from 'src/audit/audit.service';
import { DRIZZLE } from 'src/db/tokens';
import { StorageService } from 'src/storage/storage.service';

interface AuditContext {
  userId: string;
  clientId: string;
  ip?: string;
  ua?: string;
}

const ALLOWED_MIME_PREFIXES = [
  'image/',
  'application/pdf',
  'text/plain',
  'text/csv',
];
const ALLOWED_EXACT_MIMES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/octet-stream',
]);

function isAllowedMime(mime: string): boolean {
  if (ALLOWED_EXACT_MIMES.has(mime)) return true;
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

@Injectable()
export class TicketAttachmentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  private async ticketClientId(ticketId: string): Promise<string | null> {
    const ticket = await this.db.query.ticketsTable.findFirst({
      where: eq(schema.ticketsTable.id, ticketId),
      with: { project: { columns: { clientId: true } } },
      columns: { id: true },
    });
    return ticket?.project?.clientId ?? null;
  }

  private async assertAccess(
    ticketId: string,
    clientId: string,
    isFirstParty: boolean,
  ): Promise<void> {
    if (isFirstParty) return;
    const ownerClientId = await this.ticketClientId(ticketId);
    if (!ownerClientId || ownerClientId !== clientId) {
      throw new Error('not_found');
    }
  }

  async list(ticketId: string, clientId: string, isFirstParty = false) {
    await this.assertAccess(ticketId, clientId, isFirstParty);

    const rows = await this.db.query.ticketAttachmentsTable.findMany({
      where: eq(schema.ticketAttachmentsTable.ticketId, ticketId),
      orderBy: [desc(schema.ticketAttachmentsTable.createdAt)],
    });

    const withUrls = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        downloadUrl: await this.storage.getSignedUrl(r.storageKey),
        createdAt: r.createdAt?.toISOString() ?? null,
      })),
    );

    return withUrls;
  }

  async upload(
    ticketId: string,
    file: Express.Multer.File,
    ctx: AuditContext,
    isFirstParty = false,
  ) {
    await this.assertAccess(ticketId, ctx.clientId, isFirstParty);

    if (!isAllowedMime(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" is not allowed.`,
      );
    }

    const attachmentId = crypto.randomUUID();
    const safeName = sanitizeFilename(file.originalname);
    const storageKey = `tickets/${ticketId}/attachments/${attachmentId}/${safeName}`;

    await this.storage.upload({
      key: storageKey,
      body: file.buffer,
      contentType: file.mimetype,
    });

    const [attachment] = await this.db
      .insert(schema.ticketAttachmentsTable)
      .values({
        id: attachmentId,
        ticketId,
        uploadedBy: ctx.userId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storageKey,
      })
      .returning();

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'ticket.attachment_uploaded',
      targetType: 'ticket',
      targetId: ticketId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { fileName: file.originalname, fileSize: file.size },
    });

    return {
      ...attachment,
      downloadUrl: await this.storage.getSignedUrl(storageKey),
      createdAt: attachment.createdAt?.toISOString() ?? null,
    };
  }

  async remove(
    attachmentId: string,
    ticketId: string,
    ctx: AuditContext,
    isFirstParty = false,
  ) {
    await this.assertAccess(ticketId, ctx.clientId, isFirstParty);

    const attachment = await this.db.query.ticketAttachmentsTable.findFirst({
      where: and(
        eq(schema.ticketAttachmentsTable.id, attachmentId),
        eq(schema.ticketAttachmentsTable.ticketId, ticketId),
      ),
      columns: { id: true, storageKey: true, fileName: true },
    });

    if (!attachment) return false;

    await this.storage.delete(attachment.storageKey);
    await this.db
      .delete(schema.ticketAttachmentsTable)
      .where(eq(schema.ticketAttachmentsTable.id, attachmentId));

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'ticket.attachment_deleted',
      targetType: 'ticket',
      targetId: ticketId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { fileName: attachment.fileName },
    });

    return true;
  }
}
