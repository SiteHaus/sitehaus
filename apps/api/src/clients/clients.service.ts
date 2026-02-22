import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { eq, inArray, schema, type Db } from '@site-haus/db';
import { DEFAULT_ROLE_PERMS } from '@site-haus/validation/core/perms';
import {
  type CreateClientInput,
  type UpdateClientInput,
} from '@site-haus/validation/forms/client';
import { AuditService } from 'src/audit/audit.service';
import { DRIZZLE } from 'src/db/tokens';

@Injectable()
export class ClientsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create a new client org with default roles and assign the creator as admin.
   */
  async create(
    data: CreateClientInput,
    ctx: { userId: string; ip?: string; ua?: string },
  ) {
    // Check for duplicate key
    const existing = await this.db.query.clientsTable.findFirst({
      where: (t, { eq }) => eq(t.key, data.key),
    });
    if (existing) throw new ConflictException('A client with that key already exists');

    const client = await this.db.transaction(async (tx) => {
      // 1. Create the client
      const [created] = await tx
        .insert(schema.clientsTable)
        .values({
          key: data.key,
          name: data.name,
          type: data.type ?? 'public',
          firstParty: data.firstParty ?? false,
          audience: data.audience,
          allowedScopes: data.allowedScopes ?? 'openid profile email',
          requiresConsent: data.requiresConsent ?? true,
        })
        .returning();

      // 2. Enable core modules
      const coreModules = await tx.query.permissionModulesTable.findMany({
        where: (t, { eq }) => eq(t.isCore, true),
      });
      if (coreModules.length > 0) {
        await tx.insert(schema.clientModulesTable).values(
          coreModules.map((m) => ({
            clientId: created.id,
            moduleId: m.id,
            enabled: true,
          })),
        );
      }

      // 3. Create admin + member roles
      const [adminRole] = await tx
        .insert(schema.rolesTable)
        .values([
          { clientId: created.id, key: 'admin', name: 'Admin', isDefault: false },
          { clientId: created.id, key: 'member', name: 'Member', isDefault: true },
        ])
        .returning();

      // 4. Assign admin permissions
      await tx.insert(schema.rolePermissionsTable).values(
        DEFAULT_ROLE_PERMS.admin.map((perm) => ({
          roleId: adminRole.id,
          perm,
        })),
      );

      // Get the member role for its default perms
      const memberRole = await tx.query.rolesTable.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.clientId, created.id), eq(t.key, 'member')),
      });
      if (memberRole) {
        await tx.insert(schema.rolePermissionsTable).values(
          DEFAULT_ROLE_PERMS.member.map((perm) => ({
            roleId: memberRole.id,
            perm,
          })),
        );
      }

      // 5. Assign the creator as admin in the new org
      await tx.insert(schema.userRolesTable).values({
        userId: ctx.userId,
        clientId: created.id,
        roleId: adminRole.id,
      });

      // 6. Auto-grant admin to all existing SiteHaus staff (anyone with the
      //    admin role on any first-party client), so staff don't need to run
      //    grant-admin every time a new client org is created.
      const firstPartyClients = await tx.query.clientsTable.findMany({
        where: (t, { eq: _eq }) => _eq(t.firstParty, true),
        columns: { id: true },
      });
      if (firstPartyClients.length > 0) {
        const staffAdminRoles = await tx.query.rolesTable.findMany({
          where: (t, { and: _and, eq: _eq, inArray: _in }) =>
            _and(
              _in(t.clientId, firstPartyClients.map((c) => c.id)),
              _eq(t.key, 'admin'),
            ),
          columns: { id: true },
        });
        if (staffAdminRoles.length > 0) {
          const staffAssignments = await tx.query.userRolesTable.findMany({
            where: (t, { inArray: _in }) =>
              _in(t.roleId, staffAdminRoles.map((r) => r.id)),
            columns: { userId: true },
          });
          const staffUserIds = [
            ...new Set(staffAssignments.map((a) => a.userId)),
          ].filter((id) => id !== ctx.userId);

          if (staffUserIds.length > 0) {
            await tx
              .insert(schema.userRolesTable)
              .values(
                staffUserIds.map((userId) => ({
                  userId,
                  clientId: created.id,
                  roleId: adminRole.id,
                })),
              )
              .onConflictDoNothing({
                target: [
                  schema.userRolesTable.userId,
                  schema.userRolesTable.clientId,
                  schema.userRolesTable.roleId,
                ],
              });
          }
        }
      }

      return created;
    });

    // Audit log must run after transaction commits so the client row is visible
    await this.audit.log({
      clientId: client.id,
      userId: ctx.userId,
      action: 'client.created',
      targetType: 'client',
      targetId: client.id,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { name: data.name, key: data.key },
    });

    return client;
  }

  async resolveByKey(key?: string) {
    if (!key) throw new BadRequestException('Missing x-client-key');

    const client = await this.db.query.clientsTable.findFirst({
      where: (t, { eq }) => eq(t.key, key),
    });

    if (!client) throw new UnauthorizedException('Unknown client');
    return client;
  }

  async resolveById(id?: string) {
    if (!id) throw new BadRequestException('Missing x-client-id');

    const client = await this.db.query.clientsTable.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    });

    if (!client) throw new UnauthorizedException('Unknown client');
    return client;
  }

  /**
   * Get full client details by ID
   */
  async getById(id: string) {
    const client = await this.db.query.clientsTable.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    });

    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  /**
   * Update client settings
   */
  async update(
    id: string,
    data: UpdateClientInput,
    ctx?: { userId?: string; ip?: string; ua?: string },
  ) {
    const [updated] = await this.db
      .update(schema.clientsTable)
      .set(data)
      .where(eq(schema.clientsTable.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Client not found');

    await this.audit.log({
      clientId: id,
      userId: ctx?.userId,
      action: 'client.updated',
      targetType: 'client',
      targetId: id,
      ip: ctx?.ip,
      ua: ctx?.ua,
      meta: data,
    });

    return updated;
  }

  /**
   * List all redirect URIs for a client
   */
  async listRedirectUris(clientId: string) {
    return this.db.query.clientRedirectUrisTable.findMany({
      where: (t, { eq }) => eq(t.clientId, clientId),
    });
  }

  /**
   * Add a redirect URI to a client
   */
  async addRedirectUri(
    clientId: string,
    uri: string,
    ctx?: { userId?: string; ip?: string; ua?: string },
  ) {
    // Check for duplicates
    const existing = await this.db.query.clientRedirectUrisTable.findFirst({
      where: (t, { eq, and }) =>
        and(eq(t.clientId, clientId), eq(t.uri, uri)),
    });

    if (existing) {
      throw new ConflictException('Redirect URI already exists');
    }

    const [created] = await this.db
      .insert(schema.clientRedirectUrisTable)
      .values({ clientId, uri })
      .returning();

    await this.audit.log({
      clientId,
      userId: ctx?.userId,
      action: 'client.redirectUri.added',
      targetType: 'client',
      targetId: clientId,
      ip: ctx?.ip,
      ua: ctx?.ua,
      meta: { uri },
    });

    return created;
  }

  /**
   * Remove a redirect URI from a client
   */
  async removeRedirectUri(
    clientId: string,
    uriId: string,
    ctx?: { userId?: string; ip?: string; ua?: string },
  ) {
    const [deleted] = await this.db
      .delete(schema.clientRedirectUrisTable)
      .where(
        eq(schema.clientRedirectUrisTable.id, uriId),
      )
      .returning();

    if (!deleted) throw new NotFoundException('Redirect URI not found');

    // Verify it belonged to the right client
    if (deleted.clientId !== clientId) {
      // This shouldn't happen due to the query, but just in case
      throw new NotFoundException('Redirect URI not found');
    }

    await this.audit.log({
      clientId,
      userId: ctx?.userId,
      action: 'client.redirectUri.removed',
      targetType: 'client',
      targetId: clientId,
      ip: ctx?.ip,
      ua: ctx?.ua,
      meta: { uri: deleted.uri },
    });

    return deleted;
  }
}
