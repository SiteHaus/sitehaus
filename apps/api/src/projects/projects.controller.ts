import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
  createProjectSchema,
  listProjectsQuerySchema,
  projectStatusTransitionSchema,
  updateProjectSchema,
} from '@site-haus/validation/forms/project';
import { AuthedRequest } from 'src/auth/access/access.guard';
import { RequirePerms } from 'src/auth/permission/require-perms.decorator';
import { ClientInRequest } from 'src/clients/client.guard';
import { ProjectsService } from './projects.service';

type Req_ = AuthedRequest & ClientInRequest;

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @RequirePerms('projects:read')
  @Get()
  async list(@Req() req: Req_, @Query() query: unknown) {
    const parsed = listProjectsQuerySchema.parse(query);
    return this.projects.list(parsed, req.client!.id, req.client!.firstParty);
  }

  @RequirePerms('projects:read')
  @Get(':projectId')
  async get(@Req() req: Req_, @Param('projectId') projectId: string) {
    const project = await this.projects.getById(projectId, req.client!.id, req.client!.firstParty);
    if (!project) throw new NotFoundException('Project not found');
    return { project };
  }

  @RequirePerms('projects:manage')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: Req_, @Body() body: unknown) {
    const parsed = createProjectSchema.parse(body);
    const project = await this.projects.create(parsed, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    return { project };
  }

  @RequirePerms('projects:manage')
  @Patch(':projectId')
  async update(
    @Req() req: Req_,
    @Param('projectId') projectId: string,
    @Body() body: unknown,
  ) {
    const parsed = updateProjectSchema.parse(body);
    const project = await this.projects.update(projectId, req.client!.id, parsed, {
      userId: req.user!.userId,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    if (!project) throw new NotFoundException('Project not found');
    return { project };
  }

  @RequirePerms('projects:manage')
  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: Req_,
    @Param('projectId') projectId: string,
  ) {
    const cancelled = await this.projects.cancel(projectId, req.client!.id, {
      userId: req.user!.userId,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    if (!cancelled) throw new NotFoundException('Project not found');
  }

  @RequirePerms('projects:manage')
  @Patch(':projectId/status')
  async transitionStatus(
    @Req() req: Req_,
    @Param('projectId') projectId: string,
    @Body() body: unknown,
  ) {
    const { status } = projectStatusTransitionSchema.parse(body);
    const result = await this.projects.transitionStatus(
      projectId,
      req.client!.id,
      status,
      {
        userId: req.user!.userId,
        ip: req.ip,
        ua: req.headers['user-agent'] as string | undefined,
      },
    );
    if (!result) throw new NotFoundException('Project not found');
    if ('error' in result) throw new BadRequestException(result.error);
    return { project: result };
  }
}
