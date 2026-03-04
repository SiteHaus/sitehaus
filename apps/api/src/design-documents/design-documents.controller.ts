import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
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
  createDesignDocumentSchema,
  designDocStatusTransitionSchema,
  publishDesignDocumentSchema,
  updateDesignDocumentSchema,
} from '@site-haus/validation/forms/design-document';
import { AuthedRequest } from 'src/auth/access/access.guard';
import { RequireAnyPerm, RequirePerms } from 'src/auth/permission/require-perms.decorator';
import { ClientInRequest } from 'src/clients/client.guard';
import { DesignDocumentsService } from './design-documents.service';

type Req_ = AuthedRequest & ClientInRequest;

@Controller('projects/:projectId/design-document')
export class DesignDocumentsController {
  constructor(private readonly docs: DesignDocumentsService) {}

  /** Shared helper: verify project access or throw */
  private async verifyAccess(projectId: string, clientId: string, isFirstParty = false) {
    const ok = await this.docs.verifyProjectAccess(projectId, clientId, isFirstParty);
    if (!ok) throw new ForbiddenException('Project not found or access denied');
  }

  @RequirePerms('documents:read')
  @Get()
  async get(
    @Req() req: Req_,
    @Param('projectId') projectId: string,
  ) {
    await this.verifyAccess(projectId, req.client!.id, req.client!.firstParty);
    const document = await this.docs.getByProjectId(projectId);
    if (!document) throw new NotFoundException('Design document not found');
    return { document };
  }

  @RequirePerms('documents:manage')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: Req_,
    @Param('projectId') projectId: string,
    @Body() body: unknown,
  ) {
    await this.verifyAccess(projectId, req.client!.id, req.client!.firstParty);
    const { content } = createDesignDocumentSchema.parse(body);
    const document = await this.docs.create(projectId, content, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    return { document };
  }

  @RequirePerms('documents:manage')
  @Patch()
  async update(
    @Req() req: Req_,
    @Param('projectId') projectId: string,
    @Body() body: unknown,
  ) {
    await this.verifyAccess(projectId, req.client!.id, req.client!.firstParty);
    const { content } = updateDesignDocumentSchema.parse(body);
    const result = await this.docs.updateContent(projectId, content);
    if (!result) throw new NotFoundException('Design document not found');
    if ('error' in result) throw new BadRequestException(result.error);
    return { document: result };
  }

  @RequirePerms('documents:manage')
  @Post('publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @Req() req: Req_,
    @Param('projectId') projectId: string,
    @Body() body: unknown,
  ) {
    await this.verifyAccess(projectId, req.client!.id, req.client!.firstParty);
    const { changeNote } = publishDesignDocumentSchema.parse(body);
    const result = await this.docs.publish(projectId, changeNote, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    if (!result) throw new NotFoundException('Design document not found');
    return { document: result };
  }

  @RequireAnyPerm('documents:manage', 'documents:approve')
  @Patch('status')
  async transitionStatus(
    @Req() req: Req_,
    @Param('projectId') projectId: string,
    @Body() body: unknown,
  ) {
    await this.verifyAccess(projectId, req.client!.id, req.client!.firstParty);
    const { status } = designDocStatusTransitionSchema.parse(body);

    // Clients (non-first-party) may only approve or request amendments
    if (!req.client!.firstParty && status !== 'approved' && status !== 'amended') {
      throw new ForbiddenException('Insufficient permissions');
    }

    const result = await this.docs.transitionStatus(projectId, status, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    if (!result) throw new NotFoundException('Design document not found');
    if ('error' in result) throw new BadRequestException(result.error);
    return { document: result };
  }

  @RequirePerms('documents:read')
  @Get('versions')
  async listVersions(
    @Req() req: Req_,
    @Param('projectId') projectId: string,
  ) {
    await this.verifyAccess(projectId, req.client!.id, req.client!.firstParty);
    const doc = await this.docs.getByProjectId(projectId);
    if (!doc) throw new NotFoundException('Design document not found');
    const versions = await this.docs.listVersions(doc.id);
    return { versions };
  }

  @RequirePerms('documents:read')
  @Get('versions/:version')
  async getVersion(
    @Req() req: Req_,
    @Param('projectId') projectId: string,
    @Param('version') versionParam: string,
  ) {
    await this.verifyAccess(projectId, req.client!.id, req.client!.firstParty);
    const doc = await this.docs.getByProjectId(projectId);
    if (!doc) throw new NotFoundException('Design document not found');
    const versionNum = parseInt(versionParam, 10);
    if (isNaN(versionNum)) throw new BadRequestException('Invalid version number');
    const version = await this.docs.getVersion(doc.id, versionNum);
    if (!version) throw new NotFoundException('Version not found');
    return { version };
  }
}
