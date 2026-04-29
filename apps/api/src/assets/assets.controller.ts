import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  listAssetsQuerySchema,
  updateAssetSchema,
} from '@site-haus/validation/forms/asset';
import { AuthedRequest } from 'src/auth/access/access.guard';
import { ClientInRequest } from 'src/clients/client.guard';
import { RequirePerms } from 'src/auth/permission/require-perms.decorator';
import storageConfig from 'src/conf/storage.config';
import { AssetsService } from './assets.service';

type Req_ = AuthedRequest & ClientInRequest;

@Controller('projects/:projectId/assets')
export class AssetsController {
  constructor(
    private readonly assets: AssetsService,
    @Inject(storageConfig.KEY)
    private readonly storageConf: ConfigType<typeof storageConfig>,
  ) {}

  private async verifyAccess(
    projectId: string,
    clientId: string,
    isFirstParty = false,
  ) {
    const ok = await this.assets.verifyProjectAccess(
      projectId,
      clientId,
      isFirstParty,
    );
    if (!ok) throw new ForbiddenException('Project not found or access denied');
  }

  @RequirePerms('assets:read')
  @Get()
  async list(
    @Req() req: Req_,
    @Param('projectId') projectId: string,
    @Query() query: unknown,
  ) {
    await this.verifyAccess(projectId, req.client!.id, req.client!.firstParty);
    const parsed = listAssetsQuerySchema.parse(query);
    return this.assets.list(projectId, parsed);
  }

  @RequirePerms('assets:read')
  @Get(':assetId')
  async get(
    @Req() req: Req_,
    @Param('projectId') projectId: string,
    @Param('assetId') assetId: string,
  ) {
    await this.verifyAccess(projectId, req.client!.id, req.client!.firstParty);
    const asset = await this.assets.getById(assetId, projectId);
    if (!asset) throw new NotFoundException('Asset not found');
    return { asset };
  }

  @RequirePerms('assets:upload')
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Req() req: Req_,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('notes') notes?: string,
  ) {
    await this.verifyAccess(projectId, req.client!.id, req.client!.firstParty);

    if (!file) {
      throw new NotFoundException('No file provided');
    }

    if (file.size > this.storageConf.maxFileSize) {
      throw new NotFoundException(
        `File too large. Maximum size is ${Math.round(this.storageConf.maxFileSize / 1024 / 1024)}MB.`,
      );
    }

    const asset = await this.assets.upload(projectId, file, notes, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });

    return { asset };
  }

  @RequirePerms('assets:manage')
  @Patch(':assetId')
  async update(
    @Req() req: Req_,
    @Param('projectId') projectId: string,
    @Param('assetId') assetId: string,
    @Body() body: unknown,
  ) {
    await this.verifyAccess(projectId, req.client!.id, req.client!.firstParty);
    const parsed = updateAssetSchema.parse(body);
    const asset = await this.assets.update(assetId, projectId, parsed, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return { asset };
  }

  @RequirePerms('assets:manage')
  @Delete(':assetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: Req_,
    @Param('projectId') projectId: string,
    @Param('assetId') assetId: string,
  ) {
    await this.verifyAccess(projectId, req.client!.id, req.client!.firstParty);
    const deleted = await this.assets.remove(assetId, projectId, {
      userId: req.user!.userId,
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
    if (!deleted) throw new NotFoundException('Asset not found');
  }
}
