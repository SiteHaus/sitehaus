import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, eq, schema, type Db } from '@site-haus/db';
import type {
  CreateBusinessProfileInput,
  UpdateBusinessProfileInput,
} from '@site-haus/validation/forms/business-profile';
import { AuditService } from 'src/audit/audit.service';
import { DRIZZLE } from 'src/db/tokens';

interface AuditContext {
  userId: string;
  clientId: string;
  ip?: string;
  ua?: string;
}

function serialise(row: typeof schema.businessProfilesTable.$inferSelect) {
  return {
    ...row,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class BusinessProfilesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async getByClientId(clientId: string) {
    const row = await this.db.query.businessProfilesTable.findFirst({
      where: eq(schema.businessProfilesTable.clientId, clientId),
    });
    return row ? serialise(row) : null;
  }

  async create(data: CreateBusinessProfileInput, ctx: AuditContext) {
    // Check for existing profile (unique constraint on clientId)
    const existing = await this.db.query.businessProfilesTable.findFirst({
      where: eq(schema.businessProfilesTable.clientId, ctx.clientId),
      columns: { id: true },
    });

    if (existing) {
      throw new ConflictException('A business profile already exists for this organization');
    }

    const [profile] = await this.db
      .insert(schema.businessProfilesTable)
      .values({
        clientId: ctx.clientId,
        businessName: data.businessName,
        industry: data.industry ?? null,
        description: data.description ?? null,
        targetAudience: data.targetAudience ?? null,
        currentPresence: data.currentPresence ?? null,
        goals: data.goals ?? null,
        painPoints: data.painPoints ?? null,
        brandColors: data.brandColors ?? null,
        brandFonts: data.brandFonts ?? null,
        hasLogo: data.hasLogo ?? false,
        inspirationUrls: data.inspirationUrls ?? null,
        competitors: data.competitors ?? null,
        additionalNotes: data.additionalNotes ?? null,
      })
      .returning();

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'business-profile.created',
      targetType: 'business_profile',
      targetId: profile.id,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { businessName: data.businessName },
    });

    return serialise(profile);
  }

  async update(clientId: string, data: UpdateBusinessProfileInput, ctx: AuditContext) {
    const updates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      updates[key] = value;
    }
    updates.updatedAt = new Date();

    const [profile] = await this.db
      .update(schema.businessProfilesTable)
      .set(updates)
      .where(eq(schema.businessProfilesTable.clientId, clientId))
      .returning();

    if (!profile) return null;

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'business-profile.updated',
      targetType: 'business_profile',
      targetId: profile.id,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { fields: Object.keys(data) },
    });

    return serialise(profile);
  }
}
