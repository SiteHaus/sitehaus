import { Module, forwardRef } from '@nestjs/common';
import { DbModule } from 'src/db/db.module';
import { ModulesModule } from 'src/modules/modules.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [DbModule, forwardRef(() => ModulesModule)],
  providers: [RolesService],
  exports: [RolesService],
  controllers: [RolesController],
})
export class RolesModule {}
