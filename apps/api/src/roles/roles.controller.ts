import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { AuthedRequest } from 'src/auth/access/access.guard';
import { RequirePerms } from 'src/auth/permission/require-perms.decorator';
import { RolesService } from './roles.service';

import {
  createRoleSchema,
  replaceRolePermsSchema,
  updateRoleSchema,
} from '@site-haus/validation/forms/role';

@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @RequirePerms('roles:read')
  @Get()
  async listRoles(@Req() req: AuthedRequest & { client?: { id: string } }) {
    return { roles: await this.roles.listForClient(req.client!.id) };
  }

  @RequirePerms('roles:manage')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRole(
    @Req() req: AuthedRequest & { client?: { id: string } },
    @Body() body: unknown,
  ) {
    const parsed = createRoleSchema.parse(body);
    const role = await this.roles.createRole(
      {
        clientId: req.client!.id,
        ...parsed,
      },
      {
        userId: req.user!.userId,
        ip: req.ip,
        ua: req.headers['user-agent'] as string | undefined,
      },
    );

    return { role };
  }

  @RequirePerms('roles:manage')
  @Patch(':roleId')
  async updateRole(
    @Req() req: AuthedRequest & { client?: { id: string } },
    @Param('roleId') roleId: string,
    @Body() body: unknown,
  ) {
    const parsed = updateRoleSchema.parse(body);
    const perms = await this.roles.updateRole(roleId, req.client!.id, parsed, {
      userId: req.user!.userId,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    return { perms };
  }

  @RequirePerms('roles:manage')
  @Delete(':roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(
    @Req() req: AuthedRequest & { client?: { id: string } },
    @Param('roleId') roleId: string,
  ) {
    await this.roles.deleteRole(roleId, req.client!.id, {
      userId: req.user!.userId,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
  }

  @RequirePerms('roles:read')
  @Get(':roleId/perms')
  async getRolePerms(
    @Req() req: AuthedRequest & { client?: { id: string } },
    @Param('roleId') roleId: string,
  ) {
    const perms = await this.roles.getRolePerms(roleId, req.client!.id);
    return { perms };
  }

  @RequirePerms('roles:manage')
  @Post(':roleId/perms/replace')
  @HttpCode(HttpStatus.NO_CONTENT)
  async replaceRolePerms(
    @Req() req: AuthedRequest & { client?: { id: string } },
    @Param('roleId') roleId: string,
    @Body() body: unknown,
  ) {
    const { perms } = replaceRolePermsSchema.parse(body);
    await this.roles.replaceRolePerms(roleId, req.client!.id, perms, {
      userId: req.user!.userId,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
  }

  @RequirePerms('roles:read')
  @Get('users/:userId/roles')
  async listUserRoles(
    @Req() req: AuthedRequest & { client?: { id: string } },
    @Param('userId') userId: string,
  ) {
    const rows = await this.roles.listUserRolesForClient(
      userId,
      req.client!.id,
    );
    return { roles: rows };
  }

  @RequirePerms('roles:assign')
  @Post('users/:userId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignRole(
    @Req() req: AuthedRequest & { client?: { id: string } },
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    const res = await this.roles.assignRoleToUser(
      userId,
      req.client!.id,
      roleId,
      req.user!.userId,
      {
        ip: req.ip,
        ua: req.headers['user-agent'] as string | undefined,
      },
    );

    if (!res) throw new ConflictException('Already assigned');
  }

  @RequirePerms('roles:assign')
  @Delete('users/:userId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unassignRole(
    @Req() req: AuthedRequest & { client?: { id: string } },
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    await this.roles.unassignRoleFromUser(userId, req.client!.id, roleId, {
      actorId: req.user!.userId,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
  }
}
