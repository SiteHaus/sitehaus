import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, lt, schema, type Db } from '@site-haus/db';
import type {
  ListAssetsQuery,
  UpdateAssetInput,
} from '@site-haus/validation/forms/asset';
import { AuditService } from 'src/audit/audit.service';
import { DRIZZLE } from 'src/db/tokens';
import { StorageService } from 'src/storage/storage.service';

interface AuditContext {
  userId: string;
  clientId: string;
  ip?: string;
  ua?: string;
}

const uploaderColumns = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

/** MIME types we allow. Grouped by category for filtering. */
const ALLOWED_MIME_PREFIXES = [
  'image/', // png, jpg, gif, svg, webp
  'font/', // ttf, otf, woff, woff2
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'text/plain',
  'text/csv',
  'application/postscript', // AI files
  'application/x-photoshop',
  'image/vnd.adobe.photoshop',
];

/** Additional exact MIME types for fonts (browsers send various types). */
const ALLOWED_EXACT_MIMES = new Set([
  'application/x-font-ttf',
  'application/x-font-otf',
  'application/font-woff',
  'application/font-woff2',
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'application/octet-stream', // catch-all for design files (fig, sketch)
]);

function isAllowedMime(mime: string): boolean {
  if (ALLOWED_EXACT_MIMES.has(mime)) return true;
  return ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

/** Sanitize a filename for use as an R2 key segment. */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

function serialise(row: typeof schema.assetsTable.$inferSelect) {
  return {
    ...row,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

@Injectable()
export class AssetsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  /** Verify project belongs to clientId. First-party callers can access any project. */
  async verifyProjectAccess(
    projectId: string,
    clientId: string,
    isFirstParty = false,
  ) {
    return this.db.query.projectsTable.findFirst({
      where: isFirstParty
        ? eq(schema.projectsTable.id, projectId)
        : and(
            eq(schema.projectsTable.id, projectId),
            eq(schema.projectsTable.clientId, clientId),
          ),
      columns: { id: true },
    });
  }

  async list(projectId: string, filters: ListAssetsQuery) {
    const { fileType, reviewStatus, limit = 50, cursor } = filters;

    const conditions = [eq(schema.assetsTable.projectId, projectId)];

    if (fileType) {
      // Filter by MIME category prefix (e.g., "image" matches "image/png")
      conditions.push(ilike(schema.assetsTable.fileType, `${fileType}%`));
    }
    if (reviewStatus) {
      conditions.push(eq(schema.assetsTable.reviewStatus, reviewStatus));
    }

    if (cursor) {
      const cursorRow = await this.db.query.assetsTable.findFirst({
        where: eq(schema.assetsTable.id, cursor),
        columns: { createdAt: true },
      });
      if (cursorRow?.createdAt) {
        conditions.push(lt(schema.assetsTable.createdAt, cursorRow.createdAt));
      }
    }

    const rows = await this.db.query.assetsTable.findMany({
      where: and(...conditions),
      orderBy: [desc(schema.assetsTable.createdAt)],
      limit: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    return {
      assets: items.map(serialise),
      nextCursor,
    };
  }

  async getById(assetId: string, projectId: string) {
    const asset = await this.db.query.assetsTable.findFirst({
      where: and(
        eq(schema.assetsTable.id, assetId),
        eq(schema.assetsTable.projectId, projectId),
      ),
      with: {
        uploader: { columns: uploaderColumns },
      },
    });

    if (!asset) return null;

    const downloadUrl = await this.storage.getSignedUrl(asset.storageKey);

    return {
      ...serialise(asset),
      uploader: asset.uploader ?? null,
      downloadUrl,
    };
  }

  async upload(
    projectId: string,
    file: Express.Multer.File,
    notes: string | undefined,
    ctx: AuditContext,
  ) {
    // Validate MIME type
    if (!isAllowedMime(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" is not allowed. Upload images, fonts, documents, or design files.`,
      );
    }

    // Generate storage key
    const assetId = crypto.randomUUID();
    const safeName = sanitizeFilename(file.originalname);
    const storageKey = `projects/${projectId}/assets/${assetId}/${safeName}`;

    // Upload to R2
    await this.storage.upload({
      key: storageKey,
      body: file.buffer,
      contentType: file.mimetype,
    });

    // Create DB row
    const [asset] = await this.db
      .insert(schema.assetsTable)
      .values({
        id: assetId,
        projectId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storageKey,
        uploadedBy: ctx.userId,
        notes: notes ?? null,
      })
      .returning();

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'asset.uploaded',
      targetType: 'asset',
      targetId: asset.id,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: {
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        projectId,
      },
    });

    return serialise(asset);
  }

  async update(
    assetId: string,
    projectId: string,
    data: UpdateAssetInput,
    ctx: AuditContext,
  ) {
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      updates[key] = value;
    }

    const [asset] = await this.db
      .update(schema.assetsTable)
      .set(updates)
      .where(
        and(
          eq(schema.assetsTable.id, assetId),
          eq(schema.assetsTable.projectId, projectId),
        ),
      )
      .returning();

    if (!asset) return null;

    const action = data.reviewStatus ? 'asset.reviewed' : 'asset.updated';
    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action,
      targetType: 'asset',
      targetId: assetId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { fields: Object.keys(data) },
    });

    return serialise(asset);
  }

  async remove(assetId: string, projectId: string, ctx: AuditContext) {
    // Get the storage key before deleting the row
    const asset = await this.db.query.assetsTable.findFirst({
      where: and(
        eq(schema.assetsTable.id, assetId),
        eq(schema.assetsTable.projectId, projectId),
      ),
      columns: { id: true, storageKey: true, fileName: true },
    });

    if (!asset) return false;

    // Delete from R2
    await this.storage.delete(asset.storageKey);

    // Delete from DB
    await this.db
      .delete(schema.assetsTable)
      .where(eq(schema.assetsTable.id, assetId));

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'asset.deleted',
      targetType: 'asset',
      targetId: assetId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { fileName: asset.fileName },
    });

    return true;
  }
}
