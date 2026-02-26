import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  createMilestoneSchema,
  reorderMilestonesSchema,
  updateMilestoneSchema,
} from '@site-haus/validation/forms/milestone';
import { z } from 'zod';
import { AuthedRequest } from 'src/auth/access/access.guard';
import { RequirePerms } from 'src/auth/permission/require-perms.decorator';
import { ClientInRequest } from 'src/clients/client.guard';
import { MilestonesService } from './milestones.service';

type Req_ = AuthedRequest & ClientInRequest;

@Controller()
export class MilestonesController {
  constructor(private readonly milestones: MilestonesService) {}

  @RequirePerms('projects:read')
  @Get('milestones/upcoming')
  async listUpcoming(@Req() req: Req_, @Query() query: unknown) {
    const { limit } = z
      .object({ limit: z.coerce.number().min(1).max(20).default(5) })
      .parse(query ?? {});
    const milestones = await this.milestones.listUpcoming(
      req.client!.id,
      req.client!.firstParty,
      limit,
    );
    return { milestones };
  }

  @RequirePerms('projects:read')
  @Get('projects/:projectId/milestones')
  async list(@Req() req: Req_, @Param('projectId') projectId: string) {
    const result = await this.milestones.list(
      projectId,
      req.client!.id,
      req.client!.firstParty,
    );
    if (result === null) throw new NotFoundException('Project not found');
    return { milestones: result };
  }

  @RequirePerms('projects:manage')
  @Post('projects/:projectId/milestones')
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: Req_, @Param('projectId') projectId: string, @Body() body: unknown) {
    const parsed = createMilestoneSchema.parse(body);
    const result = await this.milestones.create(projectId, parsed, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    }, req.client!.firstParty);
    if ('error' in result) throw new ForbiddenException(result.error);
    return { milestone: result };
  }

  // reorder must be declared before :milestoneId routes to avoid param shadowing
  @RequirePerms('projects:manage')
  @Post('milestones/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorder(@Req() req: Req_, @Body() body: unknown) {
    const { orderedIds } = reorderMilestonesSchema.parse(body);
    await this.milestones.reorder(orderedIds, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
  }

  @RequirePerms('projects:manage')
  @Patch('milestones/:milestoneId')
  async update(
    @Req() req: Req_,
    @Param('milestoneId') milestoneId: string,
    @Body() body: unknown,
  ) {
    const parsed = updateMilestoneSchema.parse(body);
    const result = await this.milestones.update(milestoneId, parsed, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    if (!result) throw new NotFoundException('Milestone not found');
    return { milestone: result };
  }

  @RequirePerms('projects:manage')
  @Delete('milestones/:milestoneId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Req() req: Req_, @Param('milestoneId') milestoneId: string) {
    const deleted = await this.milestones.delete(milestoneId, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    if (!deleted) throw new NotFoundException('Milestone not found');
  }

  @RequirePerms('projects:read')
  @Post('milestones/:milestoneId/sign-off')
  async signOff(@Req() req: Req_, @Param('milestoneId') milestoneId: string) {
    const result = await this.milestones.signOff(
      milestoneId,
      req.client!.id,
      req.user!.userId,
    );
    if (!result) throw new NotFoundException('Milestone not found');
    if ('error' in result) throw new BadRequestException(result.error);
    return { milestone: result };
  }
}
