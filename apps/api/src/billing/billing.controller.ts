import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  createOneTimeSchema,
  createSubscriptionSchema,
  listBillingQuerySchema,
} from '@site-haus/validation/forms/billing';
import { AuthedRequest } from 'src/auth/access/access.guard';
import { RequireAnyPerm, RequirePerms } from 'src/auth/permission/require-perms.decorator';
import { ClientInRequest } from 'src/clients/client.guard';
import { BillingService } from './billing.service';

type Req_ = AuthedRequest & ClientInRequest;

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @RequireAnyPerm('billing:read', 'billing:manage')
  @Get()
  async list(@Req() req: Req_, @Query() query: unknown) {
    const parsed = listBillingQuerySchema.parse(query);
    const records = await this.billing.list(
      parsed,
      req.client!.id,
      req.client!.firstParty,
    );
    return { records };
  }

  // Client-facing: get Stripe billing portal URL
  @RequireAnyPerm('billing:read', 'billing:manage')
  @Get('portal')
  async getPortalUrl(@Req() req: Req_) {
    if (req.client!.firstParty) throw new ForbiddenException('Not available for admin');
    const url = await this.billing.getPortalUrl(req.client!.id);
    if (!url) throw new NotFoundException('Client not found or no billing configured');
    return { url };
  }

  // Admin-facing: revenue overview
  @RequirePerms('billing:manage')
  @Get('admin')
  async getAdminOverview(@Req() req: Req_) {
    if (!req.client!.firstParty) throw new ForbiddenException('Admin only');
    return this.billing.getAdminOverview();
  }

  @RequirePerms('billing:manage')
  @Post('subscriptions')
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(@Req() req: Req_, @Body() body: unknown) {
    if (!req.client!.firstParty) throw new ForbiddenException('Admin only');
    const parsed = createSubscriptionSchema.parse(body);
    const result = await this.billing.createSubscription(parsed, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    if ('error' in result) throw new ForbiddenException(result.error);
    return { record: result };
  }

  @RequirePerms('billing:manage')
  @Post('one-time')
  @HttpCode(HttpStatus.CREATED)
  async createOneTime(@Req() req: Req_, @Body() body: unknown) {
    if (!req.client!.firstParty) throw new ForbiddenException('Admin only');
    const parsed = createOneTimeSchema.parse(body);
    const result = await this.billing.createOneTime(parsed, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    if ('error' in result) throw new ForbiddenException(result.error);
    return { record: result };
  }
}
