import { Inject, Injectable } from '@nestjs/common';
import { schema, type Db } from '@site-haus/db';
import { DRIZZLE } from 'src/db/tokens';

@Injectable()
export class RolesService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

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
}
