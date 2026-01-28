import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { buildAcceptUrl } from '@site-haus/utils/core/helpers';
import {
  acceptInviteSchema,
  createInviteSchema,
} from '@site-haus/validation/forms/invite';
import { type Request } from 'express';
import { AuthedRequest } from 'src/auth/access/access.guard';
import { RequirePerms } from 'src/auth/permission/require-perms.decorator';
import { type ClientInRequest } from 'src/clients/client.guard';
import { ClientsService } from 'src/clients/clients.service';
import emailConfig from 'src/conf/email.config';
import { EmailService } from 'src/email/email.service';
import { Public } from 'src/public.decorator';
import { RolesService } from 'src/roles/roles.service';
import { InvitesService } from './invites.service';

@Throttle({ auth: {} })
@Controller('invites')
export class InvitesController {
  constructor(
    private readonly invites: InvitesService,
    private readonly email: EmailService,
    private readonly clients: ClientsService,
    private readonly roles: RolesService,
    @Inject(emailConfig.KEY)
    private readonly emailCfg: ConfigType<typeof emailConfig>,
  ) {}

  @RequirePerms('invites:read')
  @Get()
  async list(@Req() req: ClientInRequest) {
    const invites = await this.invites.list(req.client.id);
    return { invites };
  }

  @RequirePerms('invites:manage')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: AuthedRequest & ClientInRequest,
    @Body() body: unknown,
  ) {
    if (!req.client) throw new BadRequestException('Unknown client');

    const parsed = createInviteSchema.parse(body);

    const { inviteId, code, expiresAt } = await this.invites.create(
      {
        clientId: req.client.id,
        email: parsed.email,
        roleIds: parsed.roleIds,
        invitedBy: req.user?.userId ?? null,
        ttlMinutes: parsed.ttlMinutes,
      },
      {
        ip: req.ip,
        ua: req.headers['user-agent'] as string | undefined,
      },
    );

    const client = await this.clients.resolveById(req.client.id);
    const roleNames = parsed.roleIds?.length
      ? await this.roles.namesByIds(parsed.roleIds, req.client.id)
      : [];

    const acceptUrl = buildAcceptUrl(this.emailCfg.appBaseUrl, {
      clientId: req.client.id,
      email: parsed.email,
      code,
    });

    const invite = {
      id: inviteId,
      clientId: req.client.id,
      email: parsed.email,
      roleIds: parsed.roleIds ?? [],
      expiresAt,
      acceptedAt: null,
      revokedAt: null,
      createdAt: new Date(),
    };

    await this.email.sendInviteCodeEmail(parsed.email, {
      appName: 'Site Haus',
      clientName: client?.name,
      inviterName: req?.user?.firstName ?? null,
      roles: roleNames,
      code,
      acceptUrl,
      expiresAt: expiresAt.toString(),
    });

    return { invite, code };
  }

  @Public()
  @Get('check')
  async check(
    @Query('clientId') clientId: string,
    @Query('email') email: string,
    @Query('code') code: string,
  ) {
    if (!clientId || !email || !code) {
      throw new BadRequestException('Missing required query parameters');
    }
    return this.invites.check({ clientId, email, code });
  }

  @Public()
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async accept(@Body() body: unknown, @Req() req: Request) {
    const parsed = acceptInviteSchema.parse(body);
    const res = await this.invites.accept({
      clientId: parsed.clientId,
      email: parsed.email,
      code: parsed.code,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      password: parsed.password,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    return res;
  }

  @RequirePerms('invites:manage')
  @Post(':id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(
    @Req() req: AuthedRequest & ClientInRequest,
    @Param('id') id: string,
  ) {
    await this.invites.revoke(id, req.client.id, {
      userId: req.user?.userId,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
  }
}
