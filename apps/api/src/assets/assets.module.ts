import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from 'src/audit/audit.module';
import storageConfig from 'src/conf/storage.config';
import { DbModule } from 'src/db/db.module';
import { StorageModule } from 'src/storage/storage.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  imports: [DbModule, AuditModule, StorageModule, ConfigModule.forFeature(storageConfig)],
  providers: [AssetsService],
  exports: [AssetsService],
  controllers: [AssetsController],
})
export class AssetsModule {}
