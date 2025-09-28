import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { renameDeviceSchema } from '@site-haus/validation/forms/device';
import { type AuthedRequest } from 'src/auth/access/access.guard';
import { RequirePerms } from 'src/auth/permission/require-perms.decorator';
import { DevicesService } from './devices.service';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @RequirePerms('devices:read')
  @Get()
  async list(@Req() req: AuthedRequest & { client?: { id: string } }) {
    const rows = await this.devices.listForUserClient(
      req.user!.userId,
      req.client!.id,
    );
    return { devices: rows };
  }

  @RequirePerms('devices:rename')
  @Post(':deviceId/rename')
  @HttpCode(HttpStatus.NO_CONTENT)
  async rename(
    @Req() req: AuthedRequest,
    @Param('deviceId') deviceId: string,
    @Body() body: unknown,
  ) {
    const parsed = renameDeviceSchema.parse(body);
    await this.devices.rename(req.user!.userId, deviceId, parsed.label ?? null);
  }

  @RequirePerms('devices:revoke')
  @Post(':deviceId/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Req() req: AuthedRequest & { client?: { id: string } },
    @Param('deviceId') deviceId: string,
  ) {
    await this.devices.revokeAllSessionsForDevice(
      req.user!.userId,
      req.client!.id,
      deviceId,
    );
  }
}
