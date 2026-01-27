import { Module } from '@nestjs/common';
import { DbModule } from 'src/db/db.module';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';

@Module({
  imports: [DbModule],
  providers: [ModulesService],
  exports: [ModulesService],
  controllers: [ModulesController],
})
export class ModulesModule {}
