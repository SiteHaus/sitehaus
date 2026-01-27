import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { AuthedRequest } from 'src/auth/access/access.guard';
import { RequirePerms } from 'src/auth/permission/require-perms.decorator';
import { ModulesService } from './modules.service';

@Controller('modules')
export class ModulesController {
  constructor(private readonly modules: ModulesService) {}

  @RequirePerms('roles:read')
  @Get()
  async listModules(@Req() req: AuthedRequest & { client?: { id: string } }) {
    const modules = await this.modules.listModules(req.client!.id);
    return { modules };
  }

  @RequirePerms('roles:read')
  @Get(':moduleId/permissions')
  async getModulePermissions(@Param('moduleId') moduleId: string) {
    const result = await this.modules.getModulePermissions(moduleId);
    return result;
  }

  @RequirePerms('roles:manage')
  @Post(':moduleId/enable')
  @HttpCode(HttpStatus.NO_CONTENT)
  async enableModule(
    @Req() req: AuthedRequest & { client?: { id: string } },
    @Param('moduleId') moduleId: string,
  ) {
    await this.modules.enableModule(
      req.client!.id,
      moduleId,
      req.user?.userId,
    );
  }

  @RequirePerms('roles:manage')
  @Delete(':moduleId/enable')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disableModule(
    @Req() req: AuthedRequest & { client?: { id: string } },
    @Param('moduleId') moduleId: string,
  ) {
    await this.modules.disableModule(req.client!.id, moduleId);
  }
}
