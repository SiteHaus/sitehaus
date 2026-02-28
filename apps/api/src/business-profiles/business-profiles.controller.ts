import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  createBusinessProfileSchema,
  updateBusinessProfileSchema,
} from '@site-haus/validation/forms/business-profile';
import { AuthedRequest } from 'src/auth/access/access.guard';
import { RequirePerms } from 'src/auth/permission/require-perms.decorator';
import { BusinessProfilesService } from './business-profiles.service';

type Req_ = AuthedRequest & { client?: { id: string } };

@Controller('business-profiles')
export class BusinessProfilesController {
  constructor(private readonly profiles: BusinessProfilesService) {}

  @Get('me')
  async getMe(@Req() req: Req_) {
    const profile = await this.profiles.getByClientId(req.client!.id);
    if (!profile) throw new NotFoundException('Business profile not found');
    return { profile };
  }

  @RequirePerms('profiles:read')
  @Get(':clientId')
  async getByClient(@Param('clientId') clientId: string) {
    const profile = await this.profiles.getByClientId(clientId);
    if (!profile) throw new NotFoundException('Business profile not found');
    return { profile };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: Req_, @Body() body: unknown) {
    const parsed = createBusinessProfileSchema.parse(body);
    const profile = await this.profiles.create(parsed, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    return { profile };
  }

  @Patch('me')
  async updateMe(@Req() req: Req_, @Body() body: unknown) {
    const parsed = updateBusinessProfileSchema.parse(body);
    const profile = await this.profiles.update(req.client!.id, parsed, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    if (!profile) throw new NotFoundException('Business profile not found');
    return { profile };
  }
}
