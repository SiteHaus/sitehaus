import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, ne, schema, type Db } from '@site-haus/db';
import { DRIZZLE } from 'src/db/tokens';
import { ModulesService } from 'src/modules/modules.service';

@Injectable()
export class RolesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly modules: ModulesService,
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

  async createRole(input: {
    clientId: string;
    key: string;
    name: string;
    description?: string;
    isDefault?: boolean;
  }) {
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

      return role;
    });
  }

  async updateRole(
    roleId: string,
    clientId: string,
    patch: { name?: string; description?: string; isDefault?: boolean },
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

      return updated!;
    });
  }

  async deleteRole(roleId: string, clientId: string) {
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

  async replaceRolePerms(roleId: string, clientId: string, perms: string[]) {
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

    return ur ?? null;
  }

  async unassignRoleFromUser(userId: string, clientId: string, roleId: string) {
    await this.db
      .delete(schema.userRolesTable)
      .where(
        and(
          eq(schema.userRolesTable.userId, userId),
          eq(schema.userRolesTable.clientId, clientId),
          eq(schema.userRolesTable.roleId, roleId),
        ),
      );
    return { ok: true as const };
  }
}
