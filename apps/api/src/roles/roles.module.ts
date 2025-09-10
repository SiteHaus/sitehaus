import { Module } from '@nestjs/common';
import { DbModule } from 'src/db/db.module';
import { RolesService } from './roles.service';

@Module({
  imports: [DbModule],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
