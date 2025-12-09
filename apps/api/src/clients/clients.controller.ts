import { Controller, Get, Inject, Req } from '@nestjs/common';
import { type ClientMember } from '@site-haus/contracts';
import { and, eq, schema, type Db } from '@site-haus/db';
import { RequirePerms } from 'src/auth/permission/require-perms.decorator';
import { DRIZZLE } from 'src/db/tokens';
import { type ClientInRequest } from './client.guard';

@Controller('clients')
export class ClientsController {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  @RequirePerms('members:read')
  @Get('me/members')
  async listMembers(@Req() req: ClientInRequest) {
    const clientId = req.client.id;

    const rows = await this.db
      .select({
        userId: schema.usersTable.id,
        email: schema.usersTable.email,
        firstName: schema.usersTable.firstName,
        lastName: schema.usersTable.lastName,
        isVerified: schema.usersTable.isVerified,
        status: schema.usersTable.status,
        roleId: schema.rolesTable.id,
        roleName: schema.rolesTable.name,
      })
      .from(schema.userRolesTable)
      .innerJoin(
        schema.usersTable,
        eq(schema.usersTable.id, schema.userRolesTable.userId),
      )
      .innerJoin(
        schema.rolesTable,
        and(
          eq(schema.rolesTable.id, schema.userRolesTable.roleId),
          eq(schema.rolesTable.clientId, clientId),
        ),
      )
      .where(eq(schema.userRolesTable.clientId, clientId));

    const byUser = new Map<string, ClientMember>();

    for (const row of rows) {
      let entry = byUser.get(row.userId);
      if (!entry) {
        entry = {
          id: row.userId,
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          isVerified: row.isVerified,
          status: row.status,
          roles: [],
        };
        byUser.set(row.userId, entry);
      }

      if (row.roleId) {
        entry.roles.push({
          id: row.roleId,
          name: row.roleName,
        });
      }
    }

    const members = Array.from(byUser.values());

    return { members };
  }
}
