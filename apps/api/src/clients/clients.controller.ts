import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { type ClientMember, type MeClient } from '@site-haus/contracts';
import { and, eq, schema, inArray, type Db } from '@site-haus/db';
import { ADMIN_PERMISSIONS } from '@site-haus/validation/core/perms';
import {
  type AddRedirectUriInput,
  createClientSchema,
  type UpdateClientInput,
} from '@site-haus/validation/forms/client';
import { type AuthedRequest } from 'src/auth/access/access.guard';
import { RequirePerms } from 'src/auth/permission/require-perms.decorator';
import { DRIZZLE } from 'src/db/tokens';
import { type ClientInRequest } from './client.guard';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly clientsService: ClientsService,
  ) {}

  @RequirePerms('clients:manage')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: AuthedRequest, @Body() body: unknown) {
    const parsed = createClientSchema.parse(body);
    const client = await this.clientsService.create(parsed, {
      userId: req.user!.userId,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    return {
      client: {
        id: client.id,
        key: client.key,
        name: client.name,
        type: client.type,
        firstParty: client.firstParty,
        canManage: true,
      },
    };
  }

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

  @RequirePerms('members:read')
  @Get('first-party')
  async listFirstParty() {
    const firstPartyClients = await this.clientsService.getFirstPartyClients();
    const clientIds = firstPartyClients.map((c) => c.id);

    if (!clientIds.length) return { staff: [] };

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
          inArray(schema.rolesTable.clientId, clientIds),
          eq(schema.rolesTable.key, 'admin'),
        ),
      )
      .where(inArray(schema.userRolesTable.clientId, clientIds));

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
        entry.roles.push({ id: row.roleId, name: row.roleName });
      }
    }

    return { staff: Array.from(byUser.values()) };
  }

  @Get('me/clients')
  async listMyClients(@Req() req: AuthedRequest) {
    const userId = req.user!.userId;

    // Check if user has clients:view_hidden permission in any client
    const canViewHidden = await this.db
      .select({ perm: schema.rolePermissionsTable.perm })
      .from(schema.userRolesTable)
      .innerJoin(
        schema.rolePermissionsTable,
        eq(schema.userRolesTable.roleId, schema.rolePermissionsTable.roleId),
      )
      .where(
        and(
          eq(schema.userRolesTable.userId, userId),
          eq(schema.rolePermissionsTable.perm, 'clients:view_hidden'),
        ),
      )
      .limit(1);

    const includeHidden = canViewHidden.length > 0;

    // Get all clients where user has any role (LEFT JOIN to include roles with no permissions)
    const rows = await this.db
      .select({
        id: schema.clientsTable.id,
        key: schema.clientsTable.key,
        name: schema.clientsTable.name,
        type: schema.clientsTable.type,
        firstParty: schema.clientsTable.firstParty,
        hidden: schema.clientsTable.hidden,
        perm: schema.rolePermissionsTable.perm,
      })
      .from(schema.userRolesTable)
      .innerJoin(
        schema.clientsTable,
        eq(schema.userRolesTable.clientId, schema.clientsTable.id),
      )
      .leftJoin(
        schema.rolePermissionsTable,
        eq(schema.userRolesTable.roleId, schema.rolePermissionsTable.roleId),
      )
      .where(
        and(
          eq(schema.userRolesTable.userId, userId),
          // Only filter hidden if user doesn't have view_hidden permission
          includeHidden ? undefined : eq(schema.clientsTable.hidden, false),
        ),
      );

    // Dedupe by client and compute canManage
    const adminSet = new Set<string>(ADMIN_PERMISSIONS);
    const byId = new Map<string, MeClient & { hidden?: boolean }>();

    for (const r of rows) {
      const existing = byId.get(r.id);
      byId.set(r.id, {
        id: r.id,
        key: r.key,
        name: r.name,
        type: r.type,
        firstParty: r.firstParty,
        hidden: r.hidden,
        canManage:
          existing?.canManage || (r.perm ? adminSet.has(r.perm) : false),
      });
    }

    const clients = Array.from(byId.values());
    return { clients };
  }

  /**
   * Get current client details (based on x-client-id header)
   */
  @RequirePerms('clients:read')
  @Get('current')
  async getCurrent(@Req() req: ClientInRequest) {
    const client = await this.clientsService.getById(req.client.id);
    return {
      client: {
        id: client.id,
        key: client.key,
        name: client.name,
        type: client.type,
        firstParty: client.firstParty,
        audience: client.audience,
        allowedScopes: client.allowedScopes,
        requiresConsent: client.requiresConsent,
        hidden: client.hidden,
        createdAt: client.createdAt?.toISOString() ?? null,
      },
    };
  }

  /**
   * Update current client settings
   */
  @RequirePerms('clients:manage')
  @Patch('current')
  async updateCurrent(
    @Req() req: AuthedRequest & ClientInRequest,
    @Body() body: UpdateClientInput,
  ) {
    const client = await this.clientsService.update(req.client.id, body, {
      userId: req.user?.userId,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    return {
      client: {
        id: client.id,
        key: client.key,
        name: client.name,
        type: client.type,
        firstParty: client.firstParty,
        audience: client.audience,
        allowedScopes: client.allowedScopes,
        requiresConsent: client.requiresConsent,
        hidden: client.hidden,
        createdAt: client.createdAt?.toISOString() ?? null,
      },
    };
  }

  /**
   * List redirect URIs for current client
   */
  @RequirePerms('clients:read')
  @Get('current/redirect-uris')
  async listRedirectUris(@Req() req: ClientInRequest) {
    const uris = await this.clientsService.listRedirectUris(req.client.id);
    return {
      redirectUris: uris.map((u) => ({
        id: u.id,
        uri: u.uri,
      })),
    };
  }

  /**
   * Add a redirect URI to current client
   */
  @RequirePerms('clients:manage')
  @Post('current/redirect-uris')
  async addRedirectUri(
    @Req() req: AuthedRequest & ClientInRequest,
    @Body() body: AddRedirectUriInput,
  ) {
    const uri = await this.clientsService.addRedirectUri(
      req.client.id,
      body.uri,
      {
        userId: req.user?.userId,
        ip: req.ip,
        ua: req.headers['user-agent'] as string | undefined,
      },
    );
    return {
      redirectUri: {
        id: uri.id,
        uri: uri.uri,
      },
    };
  }

  /**
   * Remove a redirect URI from current client
   */
  @RequirePerms('clients:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('current/redirect-uris/:uriId')
  async removeRedirectUri(
    @Req() req: AuthedRequest & ClientInRequest,
    @Param('uriId') uriId: string,
  ) {
    await this.clientsService.removeRedirectUri(req.client.id, uriId, {
      userId: req.user?.userId,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
  }
}
