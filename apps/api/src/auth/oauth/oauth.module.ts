import { Module, forwardRef } from '@nestjs/common';
import { ClientsModule } from 'src/clients/clients.module';
import { DbModule } from 'src/db/db.module';
import { UsersModule } from 'src/users/users.module';
import { AuthCodeModule } from '../auth-code/auth-code.module';
import { AuthModule } from '../auth.module';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';

@Module({
  imports: [
    DbModule,
    ClientsModule,
    UsersModule,
    AuthCodeModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [OAuthController],
  providers: [OAuthService],
  exports: [OAuthService],
})
export class OAuthModule {}
