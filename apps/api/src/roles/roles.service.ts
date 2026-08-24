import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, ne, schema, type Db } from '@site-haus/db';
import { AuditService } from 'src/audit/audit.service';
import { DRIZZLE } from 'src/db/tokens';
import { ModulesService } from 'src/modules/modules.service';

@Injectable()
export class RolesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly modules: ModulesService,
    private readonly audit: AuditService,
  ) {}

  async namesByIds(roleIds: string[], clientId?: string): Promise<string[]> {
    if (!roleIds.length) return [];

    const rows = await this.db.query.rolesTable.findMany({
      where: (t, { and: _and, inArray: _in, eq: _eq }) =>
        clientId
          ? _and(_eq(t.clientId, clientId), _in(t.id, roleIds))
          : _in(t.id, roleIds),
      columns: { name: true },
    });
    return rows.map((r) => r.name).filter(Boolean);
  }

  async getDefaultRoleId(clientId: string) {
    const r = await this.db.query.rolesTable.findFirst({
      where: (t, { and: _and, eq: _eq }) =>
        _and(_eq(t.clientId, clientId), _eq(t.isDefault, true)),
      columns: { id: true },
    });
    return r?.id ?? null;
  }

  async assignDefaultIfAny(
    userId: string,
    clientId: string,
    assignedBy?: string,
  ) {
    const rid = await this.getDefaultRoleId(clientId);
    if (!rid) return null;
    const [ur] = await this.db
      .insert(schema.userRolesTable)
      .values({ userId, clientId, roleId: rid, assignedBy })
      .onConflictDoNothing()
      .returning();

    return ur ?? null;
  }

  async permsForUserClient(
    userId: string,
    clientId: string,
  ): Promise<Set<string>> {
    const assigns = await this.db.query.userRolesTable.findMany({
      where: (t, { and: _and, eq: _eq }) =>
        _and(_eq(t.userId, userId), _eq(t.clientId, clientId)),
      columns: { roleId: true },
    });
    if (!assigns.length) return new Set();

    const rps = await this.db.query.rolePermissionsTable.findMany({
      where: (t, { inArray: _in }) =>
        _in(
          t.roleId,
          assigns.map((a) => a.roleId),
        ),
      columns: { perm: true },
    });

    return new Set(rps.map((rp) => rp.perm));
  }

  /**
   * True only if this specific user holds an admin role on a genuine
   * first-party (SiteHaus-internal) client — not merely "was this request
   * routed through an app whose own client-key is first-party." A
   * public-facing app like the dashboard is legitimately first-party at
   * the app level (it must be, to let staff act across clients), but every
   * one of its callers — regular customers included — inherited that
   * privilege undifferentiated. This is the check that tells the two
   * apart. See the incident ledger entry dated around the fix for the
   * cross-tenant project/asset/billing exposure this closes.
   */
  async isGenuineStaff(userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ roleId: schema.userRolesTable.roleId })
      .from(schema.userRolesTable)
      .innerJoin(
        schema.rolesTable,
        eq(schema.rolesTable.id, schema.userRolesTable.roleId),
      )
      .innerJoin(
        schema.clientsTable,
        eq(schema.clientsTable.id, schema.rolesTable.clientId),
      )
      .where(
        and(
          eq(schema.userRolesTable.userId, userId),
          eq(schema.rolesTable.key, 'admin'),
          eq(schema.clientsTable.firstParty, true),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  listForClient(clientId: string) {
    return this.db.query.rolesTable.findMany({
      where: (t, { eq: _eq }) => _eq(t.clientId, clientId),
      orderBy: (t, { asc }) => [asc(t.key)],
      columns: {
        id: true,
        key: true,
        name: true,
        description: true,
        isDefault: true,
        createdAt: true,
      },
    });
  }

  async createRole(
    input: {
      clientId: string;
      key: string;
      name: string;
      description?: string;
      isDefault?: boolean;
    },
    ctx?: { userId?: string; ip?: string; ua?: string },
  ) {
    return this.db.transaction(async (tx) => {
      const [role] = await tx
        .insert(schema.rolesTable)
        .values({
          clientId: input.clientId,
          key: input.key,
          name: input.name,
          description: input.description,
          isDefault: !!input.isDefault,
        })
        .onConflictDoNothing()
        .returning();

      if (!role)
        throw new ConflictException('Role key already exists for this client');

      if (role.isDefault) {
        await tx
          .update(schema.rolesTable)
          .set({ isDefault: false })
          .where(
            and(
              eq(schema.rolesTable.clientId, input.clientId),
              ne(schema.rolesTable.id, role.id),
            ),
          );
      }

      await this.audit.log({
        clientId: input.clientId,
        userId: ctx?.userId,
        action: 'role.created',
        targetType: 'role',
        targetId: role.id,
        ip: ctx?.ip,
        ua: ctx?.ua,
        meta: { key: input.key, name: input.name },
      });

      return role;
    });
  }

  async updateRole(
    roleId: string,
    clientId: string,
    patch: { name?: string; description?: string; isDefault?: boolean },
    ctx?: { userId?: string; ip?: string; ua?: string },
  ) {
    return this.db.transaction(async (tx) => {
      const role = await tx.query.rolesTable.findFirst({
        where: (t, { and: _and, eq: _eq }) =>
          _and(_eq(t.id, roleId), _eq(t.clientId, clientId)),
      });

      if (!role) throw new NotFoundException('Role not found');

      const [updated] = await tx
        .update(schema.rolesTable)
        .set({
          name: patch.name ?? role.name,
          description: patch.description ?? role.description,
          isDefault: patch.isDefault ?? role.isDefault,
        })
        .where(eq(schema.rolesTable.id, roleId))
        .returning();

      if (patch.isDefault === true) {
        await tx
          .update(schema.rolesTable)
          .set({ isDefault: false })
          .where(
            and(
              eq(schema.rolesTable.clientId, clientId),
              ne(schema.rolesTable.id, roleId),
            ),
          );
      }

      await this.audit.log({
        clientId,
        userId: ctx?.userId,
        action: 'role.updated',
        targetType: 'role',
        targetId: roleId,
        ip: ctx?.ip,
        ua: ctx?.ua,
        meta: patch,
      });

      return updated!;
    });
  }

  async deleteRole(
    roleId: string,
    clientId: string,
    ctx?: { userId?: string; ip?: string; ua?: string },
  ) {
    return this.db.transaction(async (tx) => {
      const role = await tx.query.rolesTable.findFirst({
        where: (t, { and: _and, eq: _eq }) =>
          _and(_eq(t.id, roleId), _eq(t.clientId, clientId)),
      });

      if (!role) throw new NotFoundException('Role not found');
      if (role.isDefault)
        throw new BadRequestException('Cannot delete the default role');

      await tx
        .delete(schema.rolesTable)
        .where(eq(schema.rolesTable.id, roleId));

      await this.audit.log({
        clientId,
        userId: ctx?.userId,
        action: 'role.deleted',
        targetType: 'role',
        targetId: roleId,
        ip: ctx?.ip,
        ua: ctx?.ua,
        meta: { key: role.key, name: role.name },
      });

      return { ok: true as const };
    });
  }

  async getRolePerms(roleId: string, clientId: string): Promise<string[]> {
    const role = await this.db.query.rolesTable.findFirst({
      where: (t, { and: _and, eq: _eq }) =>
        _and(_eq(t.id, roleId), _eq(t.clientId, clientId)),
      columns: { id: true },
    });

    if (!role) throw new NotFoundException('Role not found');

    const rps = await this.db.query.rolePermissionsTable.findMany({
      where: (t, { eq: _eq }) => _eq(t.roleId, roleId),
      columns: { perm: true },
      orderBy: (t, { asc }) => [asc(t.perm)],
    });

    return rps.map((r) => r.perm);
  }

  async replaceRolePerms(
    roleId: string,
    clientId: string,
    perms: string[],
    ctx?: { userId?: string; ip?: string; ua?: string },
  ) {
    return this.db.transaction(async (tx) => {
      const role = await tx.query.rolesTable.findFirst({
        where: (t, { and: _and, eq: _eq }) =>
          _and(_eq(t.id, roleId), _eq(t.clientId, clientId)),
        columns: { id: true },
      });

      if (!role) throw new NotFoundException('Role not found');

      if (perms.length) {
        // Validate permissions exist in catalog
        const catalog = await tx.query.permissionsCatalogTable.findMany({
          where: (t, { inArray: _in }) => _in(t.perm, perms),
          columns: { perm: true },
        });

        const found = new Set(catalog.map((c) => c.perm));
        const missing = perms.filter((p) => !found.has(p));

        if (missing.length)
          throw new BadRequestException(
            `Unknown permissions: ${missing.join(', ')}`,
          );

        // Validate permissions are from enabled modules
        const moduleValidation =
          await this.modules.validatePermissionsForClient(clientId, perms);

        if (!moduleValidation.valid) {
          throw new BadRequestException(
            `Permissions from disabled modules: ${moduleValidation.invalidPerms.join(', ')}. Enable the module first.`,
          );
        }
      }

      await tx
        .delete(schema.rolePermissionsTable)
        .where(eq(schema.rolePermissionsTable.roleId, roleId));
      if (perms.length) {
        await tx
          .insert(schema.rolePermissionsTable)
          .values(perms.map((perm) => ({ roleId, perm })));
      }

      await this.audit.log({
        clientId,
        userId: ctx?.userId,
        action: 'role.permissions.updated',
        targetType: 'role',
        targetId: roleId,
        ip: ctx?.ip,
        ua: ctx?.ua,
        meta: { permCount: perms.length },
      });

      return { ok: true as const };
    });
  }

  async listUserRolesForClient(userId: string, clientId: string) {
    return this.db.query.userRolesTable.findMany({
      where: (t, { and: _and, eq: _eq }) =>
        _and(_eq(t.userId, userId), _eq(t.clientId, clientId)),
      columns: { roleId: true, createdAt: true, assignedBy: true },
    });
  }

  async assignRoleToUser(
    userId: string,
    clientId: string,
    roleId: string,
    assignedBy?: string,
    ctx?: { ip?: string; ua?: string },
  ) {
    const role = await this.db.query.rolesTable.findFirst({
      where: (t, { and: _and, eq: _eq }) =>
        _and(_eq(t.id, roleId), _eq(t.clientId, clientId)),
      columns: { id: true },
    });
    if (!role)
      throw new BadRequestException('Role does not belong to this client');

    const [ur] = await this.db
      .insert(schema.userRolesTable)
      .values({ userId, clientId, roleId, assignedBy })
      .onConflictDoNothing({
        target: [
          schema.userRolesTable.userId,
          schema.userRolesTable.clientId,
          schema.userRolesTable.roleId,
        ],
      })
      .returning();

    if (ur) {
      await this.audit.log({
        clientId,
        userId: assignedBy,
        action: 'role.assigned',
        targetType: 'user',
        targetId: userId,
        ip: ctx?.ip,
        ua: ctx?.ua,
        meta: { roleId },
      });
    }

    return ur ?? null;
  }

  async unassignRoleFromUser(
    userId: string,
    clientId: string,
    roleId: string,
    ctx?: { actorId?: string; ip?: string; ua?: string },
  ) {
    await this.db
      .delete(schema.userRolesTable)
      .where(
        and(
          eq(schema.userRolesTable.userId, userId),
          eq(schema.userRolesTable.clientId, clientId),
          eq(schema.userRolesTable.roleId, roleId),
        ),
      );

    await this.audit.log({
      clientId,
      userId: ctx?.actorId,
      action: 'role.unassigned',
      targetType: 'user',
      targetId: userId,
      ip: ctx?.ip,
      ua: ctx?.ua,
      meta: { roleId },
    });

    return { ok: true as const };
  }
}
